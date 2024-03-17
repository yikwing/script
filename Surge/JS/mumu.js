const updateResponse = (response) => {
  const nowTime = Date.parse(new Date()) / 1000;

  const parsedResponse = JSON.parse(response.body);
  parsedResponse.data.current_device.trial_end_at = nowTime + 31 * 3600 * 24;
  parsedResponse.data.current_device.trial_status = 1;
  return JSON.stringify(parsedResponse);
};

const logResponse = (response) => {
  console.log(`\n==================\n${response}\n=================\n`);
};

const response = $response;
logResponse(response.body);

const updatedResponse = updateResponse(response);
logResponse(updatedResponse);

$done({ body: updatedResponse });
