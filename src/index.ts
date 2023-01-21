import * as dotenv from 'dotenv';
import { Octokit } from 'octokit';
import {
  Questions,
  ChallengeSubmission,
  Label
} from './utils';

dotenv.config();

const octokit = new Octokit({
    auth: process.env.TOKEN
});

// Function to get all repositories public and privates from a especific team
async function getReposTeam() {
  const result = await octokit.request("GET /orgs/{org}/teams/{team_slug}/repos", {
    org: 'heavy-duty',
    team_slug: 'bounty-program',
  })

  const arrayOfRepos = result.data.map(repo => { 
    return {
      id: repo.id,
      name: repo.name,
      owner: repo.owner.login,
      url: repo.url,
      issues_url: repo.issues_url,
      issue_events_url: repo.issue_events_url,
      issue_comment_url: repo.issue_comment_url,
      open_issues_count: repo.open_issues_count,
      open_issues: repo.open_issues,
    }
  })

  return arrayOfRepos;
}

// Function to scrap body of issue and return an array of strings with the lines of body after "### Submission Entered:\n\n"
function cleanBody(body: string) {
  const submissionEntered: string[] = body.split("### Submission Entered:");

  const submissionEntered2: string = submissionEntered[1].replace(/(\r)/gm, "");

  const submissionEnteredDivided2: string[] = submissionEntered2.split("\n");

  // Delet from submissionEnteredDivided2 the '' elements included if the last element of array is ''
  const submissionEnteredDividedClean: string[] = submissionEnteredDivided2.filter(line => line != '');

  return submissionEnteredDividedClean;
}

// Function what leave an array of labels (objects) find the content (parameter) of key name.
function findInLabel(labels: string | any[], body: string) {

  const labelsObject: Label = {
    challengeId: NaN,
    user: null,
    points: NaN,
    status: null,
    followup: false
  };

  for (let i = 0; i < labels.length; i++) {

    if (labels[i].name.startsWith("challengeId:")){
      labelsObject.challengeId = labels[i].name.substring("challengeId:".length) - 0;
    } else if (labels[i].name.startsWith("user:")){
      labelsObject.user = labels[i].name.substring("user:".length);
    } else if (labels[i].name.startsWith("points:")){
      labelsObject.points = labels[i].name.substring("points:".length) - 0;
    } else if (labels[i].name === "completed" || labels[i].name === "invalid"){
      labelsObject.status = labels[i].name;
    } else if (labels[i].name === "followup"){
      labelsObject.followup = true;
    }
  }

  // If user and challengeId are null search in body of issue
  if (labelsObject.user === null || Number.isNaN(labelsObject.challengeId)) {

    const submissionEnteredDividedClean: string[] = cleanBody(body);

    const challengeIdString: string = submissionEnteredDividedClean[0].replace("Challenge Id: [#", "");
    const challengeId = Number(challengeIdString.substring(0, challengeIdString.length - 1));

    const hunterString = submissionEnteredDividedClean[1].replace("Hunter: ", "");
    var hunter: string;

    if (hunterString.startsWith("<a href=")) {
      hunter = hunterString.substring( hunterString.indexOf(">")+1, hunterString.lastIndexOf("<"));
    } else {
      hunter = hunterString;
    }

    labelsObject.challengeId = challengeId;
    labelsObject.user = hunter;    
  }

  return labelsObject;
}

// Function what recibe a body of issue and scrap the info by question and answer
function scrapQuestions(body: string) {

  // Create a array of type object
  const questions: Questions[] = [];

  // In body when find "### Submission Entered:\n\n" ignore "Challenge Id:" and your his value and ignore "\nHunter:" and his value. After "\n\n" every line is a question and next line is his answer. Save every Question and Answer in a array of object when every object has two properties, question and answer.

  // Example of body = "\n___\n### Description\n\nHeavy Duty Builders wants to give a non-official space for teams like yours, that were expecting to share their projects on Demo Day. That’s why this is a very simple but important challenge that would not only help you earn more points but also to share your impact on the Solana ecosystem. \n\nGood luck **hunter**!\n\n1. Make a **SHORT** video of your elevator pitch!\n\n2. Publish it on Twitter with the #BreakpointChallenges and #NonOfficialDemoDay\n\n3. Include @HeavyDutyBuild\n\n\n### Tips\n-Let people know where they can find out more about your project or connect with the team.\n\n-Keep it simple! You never know who could be watching emojieyes\n\n\n___\n### Submission Entered:\n\nChallenge Id: [#223004011]\nHunter: Milan Cupac\n\n1. What’s your Twitter handle?:\n@Cupa" 

  const submissionEnteredDividedClean: string[] = cleanBody(body);

  // Delet 'Challenge Id' and 'Hunter' from submissionEnteredDividedClean
  submissionEnteredDividedClean.splice(0,2);

  var question = '';
  var answer = '';

  for (let i = 0; i < submissionEnteredDividedClean.length; i++) {

    // Check if submissionEnteredDividedClean[i] is a question. 
    // This is if start with a number followed by a period and followed by space. Regex expresion is: /[0-9]+\. /g
    if (/^[0-9]+\. /g.test(submissionEnteredDividedClean[i])){

      // Old question and answer
      if (question != '' && answer != ''){
        questions.push({
          question: question,
          answer: answer
        })
      }

      // New question
      question = submissionEnteredDividedClean[i];
      answer = '';

    } else {
      // Here submissionEnteredDividedClean[i] is a answer or a part of one answer:
      if (answer === '') {
        answer += submissionEnteredDividedClean[i];
      } else {
        answer += '\n' + submissionEnteredDividedClean[i];

      }

      // If is the last element of array
      if (i === submissionEnteredDividedClean.length - 1) {
        questions.push({
          question: question,
          answer: answer
        })
      }
    }
  }

  // Checking questions and submissionEnteredDividedClean
  // if (questions.length != submissionEnteredDividedClean.length / 2) {
  //   console.log("submissionEnteredDividedClean: ", submissionEnteredDividedClean);
  //   console.log("questions: ", questions);
  // }

  return questions;

}

// Function to scrap the body of a issue Current Leaderboard and return an array of objects with the info
// function scrapUsers(body: string) {

//   const obj = JSON.parse(body)
//   const users: Users[] = obj.users;
  
//   return users;
// }

// Function to get all issues from a especific repository and team
async function getIssuesTeam(repo: string, owner: string, numberIsues: number) {

  const arrayIssues: ChallengeSubmission[] = [];
  const numberPages = Math.ceil(numberIsues / 100);

  for (let i = 1; i <= numberPages; i++) {

    // for every issue in the repository add the issue number to the array
    const result = await octokit.request("GET /repos/{owner}/{repo}/issues", {
      owner: owner,
      repo: repo,
      state: 'open',
      per_page: 100,
      page: i,
    })

    const arrayOfIssues: ChallengeSubmission[] = [];
    
    result.data.forEach(issue => {

      // Chek if the issue have property pull_request
      // If have, is a pull request
      // If not, is a issue
      if (!issue.hasOwnProperty('pull_request')) {

        // If the issue have name "Current Leaderboard"
        // if (issue.title.startsWith("Current Leaderboard")) {
        //   arrayOfIssues.push(
        //     {
        //       title: issue.title,
        //       repository: repo,
        //       id: issue.id,
        //       users: scrapUsers(`${issue.body}`),
        //     }
        //   );
        // } 
        if (issue.title.startsWith("Challenge Submission")) {
          arrayOfIssues.push(
            {
              title: issue.title,
              repository: repo,
              id: issue.id,
              body: issue.body,
              ...findInLabel(issue.labels, `${issue.body}`),
              questions: scrapQuestions(`${issue.body}`),
            }
          );
        }
      }
    })
    arrayIssues.push(...arrayOfIssues);
  }

  return arrayIssues;
}

// Function to chek data type CurrentLeaderboard
// function instanceOfCurrentLeaderboard(object: any): object is CurrentLeaderboard {
//   return object.title.startsWith("Current Leaderboard");
// }

// Function to chek data type ChallengeSubmission
function instanceOfChallengeSubmission(object: any): object is ChallengeSubmission {
  return object.title.startsWith("Challenge Submission");
}

// Function what by user finded in an issue create a object with properties user, points and an array of objects with properties challengeId and questions 
function issuesPerUsers (issues: ChallengeSubmission[]){
  const issuesByUsers: Object = {};

  // For each issue.user create a property/key in issuesByUsers with value {sumPoints and an array of issues asocciated with this user}

  // if issue is a Challenges Submission add the points of the issue to the sumPoints of the user
  // if issue is a Current Leaderboard create a property/key in issuesByUsers with value {sumPoints and an array of issues asocciated with this user}
  for (const issue of issues) {

    // Check if type of issue is CurrentLeaderboard
    // if (instanceOfCurrentLeaderboard(issue)) {
    //   for (const user of issue.users) {
    //     if (issuesByUsers.hasOwnProperty(`${user.user}`)) {
    //       issuesByUsers[`${user.user}`].sumPoints += user.points;
    //     } else {
    //       issuesByUsers[`${user.user}`] = {
    //         sumPoints: user.points,
    //       }
    //     }
    //   }
    // } else 

    // Check if type of issue is ChallengeSubmission
    if(instanceOfChallengeSubmission(issue)){

      const user = issue.user;
      const repository = `${issue.repository}-Points`;

      if (issuesByUsers.hasOwnProperty(user)) {
        issuesByUsers[user].issues.push(issue);
        issuesByUsers[user].sumPoints += issue.points;

        // if issuesByUsers[user] have property key named of issue.repository add the points of the issue to the value of this property key
        if (issuesByUsers[user].hasOwnProperty(repository)) {
          issuesByUsers[user][repository] += issue.points;
        } else {
          // if issuesByUsers[user] dont have property key named of issue.repository create this property key and add the points of the issue to the value of this property key
          issuesByUsers[user][repository] = issue.points;
        }

      } else {
        // Create property key in issuesByUsers named of issue.repository and value of issue.points
        issuesByUsers[user] = {
          issues: [issue],
          sumPoints: issue.points,
          [repository]: issue.points,
        }
      } 
    }
  }
  return issuesByUsers;
}

// Function to create a JSON file
function createJSONFile(object: Object | Object[], name: string) {

  // Convert the Object / Array of all issues in a JSON file
  const fs = require('fs');
  const data = JSON.stringify(object);

  // Create folder and file if this dont exits
  fs.promises.mkdir('./src/issues/', { recursive: true }).catch(console.error);
  fs.writeFileSync(`./src/issues/${name}.json`, data)
}

(async function main() {
  try {
  const arrayOfRepos = await getReposTeam();

  // Guardar todas las issues de todos los repositorio de arrayOfRepos en issuesOfAllRepos

  // Array of all issues from all repos
  const issuesOfAllRepos: ChallengeSubmission[] = [];

  // For each repo return and save their issues
  for (let i = 0; i < arrayOfRepos.length; i++) {
    const nameRepo: string = arrayOfRepos[i].name;
    const ownerRepo: string = arrayOfRepos[i].owner;
    const numberIsues: number = Number(arrayOfRepos[i].open_issues_count);

    const issuesPerRepo: ChallengeSubmission[] = await getIssuesTeam(nameRepo, ownerRepo, numberIsues);


    // Add all issues of this repo to the array of all issues
    issuesOfAllRepos.push(...issuesPerRepo);

    // Print the array of all issues in this repo

    // Convert the array of all issues in a JSON file
    // createJSONFile(issuesPerRepo, nameRepo)
  }

  const issuesPerUsersObject: Object = issuesPerUsers(issuesOfAllRepos);

  // Print the Object of all issues
  console.log(issuesPerUsersObject);

  // Convert the Object of all issues in a JSON file
  createJSONFile(issuesPerUsersObject, 'issues')
  
  } catch (error: any) {
    console.log(`Error! Status: ${error.status}. Message: ${error}`)

  }
})();