const updateResponse = (response) => {
  const parsedResponse = JSON.parse(response.body);
  parsedResponse.svip = {
    status: 1,
    startTime: "2023-01-20",
    endTime: "2099-12-31",
  };
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
