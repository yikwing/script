let headers = $response.headers;

headers["user-agent"] = "Surge";

let body = $response.body;

let tmp = JSON.parse(body);

tmp["User-Agent"] = "quanx";

console.log("==================\n\n" + body + "\n=================");

$done({ headers, body: JSON.stringify(tmp) });
