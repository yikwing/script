const updateResponse = (response) => {
  const parsedResponse = JSON.parse(response.body);
  parsedResponse.vip_grade = 1;
  parsedResponse.vip_start_date = 1709693142;
  parsedResponse.vip_end_date = 1712371542;
  return JSON.stringify(parsedResponse);
};

const logResponse = (response) => {
  console.log(`==================\n\n${response}\n=================`);
};

const response = $response;
logResponse(response.body);

const updatedResponse = updateResponse(response);
logResponse(updatedResponse);

$done({ body: updatedResponse });
