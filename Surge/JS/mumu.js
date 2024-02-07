// let headers = $response.headers;

// headers["user-agent"] = "Surge";

let body = $response.body;

let tmp = JSON.parse(body);

console.log("==================\n\n" + body + "\n=================");

tmp["data"]["current_device"]["trial_end_at"] = 1712246399;

console.log("==================\n\n" + tmp + "\n=================");

$done({ body: JSON.stringify(tmp) });
