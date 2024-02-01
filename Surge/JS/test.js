let headers = $request.headers;

console.log("headers: " + JSON.stringify(headers));

headers["user-agent"] = "Surge";

$done({ headers });
