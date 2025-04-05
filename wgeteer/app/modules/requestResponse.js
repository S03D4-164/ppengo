const crypto = require("crypto");
const logger = require("./logger");
const Payload = require("../models/payload");

async function savePayload(responseBuffer) {
  try {
    let md5Hash = crypto.createHash("md5").update(responseBuffer).digest("hex");
    //var ftype = fileType(responseBuffer);
    //console.log("[Response] fileType", ftype)
    //ftype = ftype?ftype.mime:undefined;
    let payload = await Payload.findOneAndUpdate(
      { md5: md5Hash },
      {
        payload: responseBuffer,
        //"fileType":ftype,
      },
      { new: true, upsert: true },
    );
    return payload._id;
  } catch (err) {
    console.log(err);
  }
  return;
}

async function saveResponse(interceptedResponse, request, responseCache) {
  let responseBuffer;
  let text;
  let payloadId;
  let responseStatus = await interceptedResponse.status();
  let interceptionId;
  try {
    for (let cache of responseCache) {
      if (interceptedResponse.url() == cache["url"]) {
        responseBuffer = cache["body"];
        text = cache["body"].toString("utf-8");
        interceptionId = cache["interceptionId"];
      }
    }
    //if (responseBuffer) console.log("[Response] cache exists");
    //else console.log("[Response] no cache");
    if (responseStatus < 300 && responseStatus > 399)
      responseBuffer = await interceptedResponse.buffer();
  } catch (err) {
    console.log("[Response] failed on save buffer", err);
    //logger.debug("[Response] failed on save buffer", err);
  }

  if (responseBuffer) payloadId = await savePayload(responseBuffer);

  try {
    if (responseStatus < 300 && responseStatus > 399)
      text = await interceptedResponse.text();
  } catch (err) {
    console.log("[Response] failed on save text", err);
    //logger.debug("[Response] failed on save text", err);
  }
  let securityDetails = {};
  try {
    if (interceptedResponse.securityDetails()) {
      securityDetails = {
        issuer: interceptedResponse.securityDetails().issuer(),
        protocol: interceptedResponse.securityDetails().protocol(),
        subjectName: interceptedResponse.securityDetails().subjectName(),
        validFrom: interceptedResponse.securityDetails().validFrom(),
        validTo: interceptedResponse.securityDetails().validTo(),
      };
    }
  } catch (error) {
    logger.debug(error);
  }

  try {
    let url = interceptedResponse.url();
    let urlHash = crypto.createHash("md5").update(url).digest("hex");
    const headers = interceptedResponse.headers();
    var newHeaders = {};
    // replace dot in header
    for (const key of Object.keys(headers)) {
      if (key.includes(".")) {
        let newKey = key.replace(/\./g, "\uff0e");
        newHeaders[newKey] = headers[key];
      } else {
        newHeaders[key] = headers[key];
      }
    }
    const response = {
      webpage: request.webpage,
      url: url,
      urlHash: urlHash,
      status: interceptedResponse.status(),
      statusText: interceptedResponse.statusText(),
      ok: interceptedResponse.ok(),
      remoteAddress: interceptedResponse.remoteAddress(),
      //headers: interceptedResponse.headers(),
      headers: newHeaders,
      securityDetails: securityDetails,
      payload: payloadId,
      text: text,
      interceptionId: interceptionId,
    };
    if (text) {
      const sizelimit = 16000000;
      const resLength = JSON.stringify(response).length;
      //console.log(resLength);
      if (resLength > sizelimit) {
        response.text = undefined;
      }
    }
    return response;
  } catch (error) {
    //logger.info(error);
    console.log(error);
  }
  return;
}

async function saveRequest(interceptedRequest, pageId) {
  let redirectChain = [];
  try {
    const chain = interceptedRequest.redirectChain();
    if (chain) {
      for (let seq in chain) {
        //console.log("[Chain]", interceptedRequest.url(),  chain[seq].url());
        redirectChain.push(chain[seq].url());
      }
    }
  } catch (error) {
    logger.info(error);
  }

  // replace dot in header
  const headers = interceptedRequest.headers();
  var newHeaders = {};
  for (const key of Object.keys(headers)) {
    if (key.includes(".")) {
      let newKey = key.replace(/\./g, "\uff0e");
      newHeaders[newKey] = headers[key];
    } else {
      newHeaders[key] = headers[key];
    }
  }

  try {
    const request = {
      webpage: pageId,
      url: interceptedRequest.url(),
      method: interceptedRequest.method(),
      resourceType: interceptedRequest.resourceType(),
      isNavigationRequest: interceptedRequest.isNavigationRequest(),
      postData: interceptedRequest.postData(),
      //headers: interceptedRequest.headers(),
      headers: newHeaders,
      failure: interceptedRequest.failure(),
      redirectChain: redirectChain,
    };
    return request;
  } catch (err) {
    console.log(err);
  }
  return;
}

module.exports = { saveRequest, saveResponse };
