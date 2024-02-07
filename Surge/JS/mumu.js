const updateResponse = (response) => {
  const parsedResponse = JSON.parse(response.body);
  parsedResponse.data.current_device.trial_end_at = 1712246399;
  parsedResponse.data.current_device.trial_status = 1;
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
