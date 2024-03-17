const updateResponse = (response) => {
  // const parsedResponse = JSON.parse(response.body);

  // parsedResponse.data.svip.status = 1;
  // parsedResponse.data.svip.endTime = "2024-12-31";

  return JSON.stringify({
    status: 0,
    msg: "",
    data: {
      vip: 0,
      svip: {
        status: 1,
        startTime: "2023-11-06",
        endTime: "2024-12-31",
        residueDays: 0,
      },
      consume: 0,
      icp: {
        status: 1,
        startTime: "2023-11-06",
        endTime: "2024-12-31",
      },
      time: "",
      asset: {
        status: 1,
        startTime: "2023-11-06",
        endTime: "2024-12-31",
      },
      isRenewSuc: 0,
      isHitOptimize: 0,
      yuqing_junior: {
        status: 1,
        startTime: "2023-11-06",
        endTime: "2024-12-31",
      },
      comPackage: {
        status: 1,
        startTime: "2023-11-06",
        endTime: "2024-12-31",
      },
      yuqing_senior: {
        status: 1,
        startTime: "2023-11-06",
        endTime: "2024-12-31",
      },
      signInStaus: 0,
      isDisplayPop: 0,
    },
  });
};

const logResponse = (response) => {
  console.log(`==================\n\n${response}\n=================`);
};

const response = $response;
logResponse(response.body);

const updatedResponse = updateResponse(response);
logResponse(updatedResponse);

$done({ body: updatedResponse });
