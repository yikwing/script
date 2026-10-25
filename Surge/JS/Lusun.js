const updateResponse = (response) => {
  const parsedResponse = JSON.parse(response.body);
  parsedResponse.vip_grade = 1;
  parsedResponse.vip_start_date = 1709693142;
  parsedResponse.vip_end_date = 1712371542;
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
