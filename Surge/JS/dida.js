// {
//   "timeStamp" : 1749397906569,
//   "proEndDate" : "1970-01-01T00:00:00.000+0000",
//   "needSubscribe" : true,
//   "pro" : false,
//   "teamPro" : false,
//   "inboxId" : "inbox1026454340",
//   "userId" : "1026454340",
//   "username" : "49999@live.com",
//   "freeTrial" : false,
//   "userCode" : "0fa8f81eb6d447f2900193aab7352d71",
//   "activeTeamUser" : false,
//   "teamUser" : false,
//   "ds" : false
// }


const updateResponse = (response) => {
  const parsedResponse = JSON.parse(response.body);
  parsedResponse.proEndDate = "2099-01-01T00:00:00.000+0000";
  parsedResponse.needSubscribe = false;
  parsedResponse.pro = true;
  return JSON.stringify(parsedResponse);
};

const logResponse = (tag, response) => {
  console.log(`==============  ${tag} start  =====================`);
  console.log(`${response}`);
  console.log(`==============  ${tag}  end   =====================`);
};

const response = $response;
logResponse("original", response.body);

const updatedResponse = updateResponse(response);
logResponse("hook", updatedResponse);

$done({ body: updatedResponse });
