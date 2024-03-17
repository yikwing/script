const updateResponse = (response) => {
  const parsedResponse = JSON.parse(response.body);

  parsedResponse.data.svip.status = 1;
  parsedResponse.data.svip.endTime = "2024-12-31";

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
