// let headers = $response.headers;

// headers["user-agent"] = "Surge";

let body = $response.body;

let tmp = JSON.parse(body);

tmp["code"]["data"]["current_device"]["trial_end_at"] = 1712246399;

console.log("==================\n\n" + body + "\n=================");

$done({ headers, body: JSON.stringify(tmp) });