let headers = $response.headers;

headers["user-agent"] = "Surge";

let body = $response.body;
body["User-Agent"] = "quanx";

console.log("==================\n\n" + body + "\n=================");

$done({ headers, body });
