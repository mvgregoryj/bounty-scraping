import * as dotenv from 'dotenv';
import { Octokit } from 'octokit';

dotenv.config();


const octokit = new Octokit({
    auth: process.env.TOKEN
});

// // Function to get all Issues from a especific repository
// async function getIssues() {
//   const result = await octokit.request("GET /repos/{owner}/{repo}/issues", {
//       owner: "mvgregoryj",
//       repo: "GregorMovies",
//   });

//   console.log(result)
//   console.log(result.status)
//   console.log(result.data)
  
//   const titleAndAuthor = result.data.map(issue => {
//     return {
//       title: issue.title,
//       userID: issue.user.id
//       }
//     })
  
//   console.log(titleAndAuthor)
// }

// Function to get all teams from a especific organization
async function getTeams() {
  const result = await octokit.request("GET /orgs/{org}/teams", {
      org: 'heavy-duty',
  });

  // console.log(result)
}

// Function to get all repositories public and privates from a especific team
async function getReposTeam() {
  const result = await octokit.request("GET /orgs/{org}/teams/{team_slug}/repos", {
    org: 'heavy-duty',
    team_slug: 'bounty-program',
  })

  // console.log(result)

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

  // const arrayOfRepos = result.data

  return arrayOfRepos;
}

// Function what leave an array of labels (objects) find the content (parameter) of key name.
function findInLabel(labels: string | any[], body: string) {

  const labelsObject = {
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
    const submissionEntered = body.split("### Submission Entered:");
    console.log(submissionEntered);

    const submissionEnteredDivided = submissionEntered[1].split("\r");
    console.log(submissionEnteredDivided);

    const submissionEntered2 = submissionEnteredDivided.join('');
    const submissionEnteredDivided2 = submissionEntered2.split("\n");

    const submissionEnteredDividedClean = submissionEnteredDivided2.filter(line => line != '');
    console.log(submissionEnteredDividedClean);

    const challengeIdString = submissionEnteredDividedClean[0].split("Challenge Id: ");
    console.log(challengeIdString);

    const challengeId = Number(challengeIdString[1].substring(2, challengeIdString[1].length - 1));
    console.log(challengeId);

    const hunterString = submissionEnteredDividedClean[1].split("Hunter: ");
    console.log(hunterString);

    const hunter = hunterString[1];
    console.log(hunter);

    labelsObject.challengeId = challengeId;
    labelsObject.user = hunter;    
  }

  return labelsObject;
}

// Function what recibe a body of issue and scrap the info by question and answer
function scrapQuestions(body: string, repo: string) {

  // Create a array of type object
  const questions: Object[] = [];

  // if (repo != "solana-colombia-hacker-house-bounty-program") {

    // In body when find "### Submission Entered:\n\n" ignore "Challenge Id:" and your his value and ignore "\nHunter:" and his value. After "\n\n" every line is a question and next line is his answer. Save every Question and Answer in a array of object when every object has two properties, question and answer.

    // Example of body = "\n___\n### Description\n\nHeavy Duty Builders wants to give a non-official space for teams like yours, that were expecting to share their projects on Demo Day. That’s why this is a very simple but important challenge that would not only help you earn more points but also to share your impact on the Solana ecosystem. \n\nGood luck **hunter**!\n\n1. Make a **SHORT** video of your elevator pitch!\n\n2. Publish it on Twitter with the #BreakpointChallenges and #NonOfficialDemoDay\n\n3. Include @HeavyDutyBuild\n\n\n### Tips\n-Let people know where they can find out more about your project or connect with the team.\n\n-Keep it simple! You never know who could be watching emojieyes\n\n\n___\n### Submission Entered:\n\nChallenge Id: [#223004011]\nHunter: Milan Cupac\n\n1. What’s your Twitter handle?:\n@Cupa" 

    const submissionEntered: string[] = body.split("### Submission Entered:");
    console.log(submissionEntered)

    const submissionEnteredDivided = submissionEntered[1].split("\n");
    console.log(submissionEnteredDivided)

    // Delet from submissionEnteredDivided the '' elements included if th last element of array is ''
    const submissionEnteredDividedClean = submissionEnteredDivided.filter(line => line != '');

    // Delet 'Challenge Id' and 'Hunter' from submissionEnteredDividedClean
    submissionEnteredDividedClean.splice(0,2);
  
    for (let i = 0; i < submissionEnteredDividedClean.length; i++) {
      if (i % 2 === 0) {
        questions.push({
          question: submissionEnteredDividedClean[i],
          answer: submissionEnteredDividedClean[i + 1]
        })
      }
    }
  
    return questions;

}

// Function to scrap the body of a issue Current Leaderboard and return an array of objects with the info
function scrapUsers(body: string) {

  const obj = JSON.parse(body)
  const users = obj.users;
  
  return users;
}

// Function to get all issues from a especific repository and team
async function getIssuesTeam(repo: string, owner: string, numberIsues: number) {

  const arrayIssues: Object[] = [];
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

    const arrayOfIssues: Object[] = [];
    
    result.data.forEach(issue => {

      // Chek if the issue have property pull_request
      // If have, is a pull request
      // If not, is a issue
      if (!issue.hasOwnProperty('pull_request')) {

        // If the issue have name "Current Leaderboard"
        if (issue.title === "Current Leaderboard") {
          arrayOfIssues.push(
            {
              title: issue.title,
              repository: repo,
              id: issue.id,
              users: scrapUsers(`${issue.body}`),
            }
          );
        } else if (issue.title.startsWith("Challenge Submission")) {
          arrayOfIssues.push(
            {
              title: issue.title,
              repository: repo,
              id: issue.id,
              body: issue.body,
              ...findInLabel(issue.labels, `${issue.body}`),
              questions: scrapQuestions(`${issue.body}`, repo),
            }
          );
        }
      }
    })
    arrayIssues.push(...arrayOfIssues);
  }

  return arrayIssues;
}

(async function main() {
  try {
  //getIssues();
  //getTeams();
  const arrayOfRepos = await getReposTeam();
  console.log(arrayOfRepos)

  // Guardar todas las issues de todos los repositorio de arrayOfRepos en issuesOfAllRepos

  // Array of all issues from all repos
  const issuesOfAllRepos = [];

  // For each repo return and save their issues
  for (let i = 0; i < arrayOfRepos.length; i++) {
    const nameRepo = arrayOfRepos[i].name;
    const ownerRepo = arrayOfRepos[i].owner;
    const numberIsues = Number(arrayOfRepos[i].open_issues_count);

    const issuesPerRepo: Object[] = await getIssuesTeam(nameRepo, ownerRepo, numberIsues);

    console.log('Issues de ', nameRepo, ': ', issuesPerRepo.length);

    // issuesOfAllRepos.push(...issuesPerRepo);

    // Print the array of all issues in this repo
    console.log(issuesPerRepo);
    console.log(issuesPerRepo.length);

    // Convert the array of all issues in a JSON file
    const fs = require('fs');
    const data = JSON.stringify(issuesPerRepo);
    fs.writeFileSync(`./src/issues/${nameRepo}.json`, data)
  }

  // // Print the array of all issues
  // console.log(issuesOfAllRepos);
  // console.log(issuesOfAllRepos.length);

  // // Convert the array of all issues in a JSON file
  // const fs = require('fs');
  // const data = JSON.stringify(issuesOfAllRepos);
  // fs.writeFileSync('./issues/issues.json', data)

  
  } catch (error: any) {
    console.log(`Error! Status: ${error.status}. Message: ${error}`)

    // console.log(`Error! Status: ${error.status}. Message: ${error.response.data}`)
  }
})();