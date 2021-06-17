import "jest";
import {
  getHashCode,
  samlLogin,
  parseSamlRequest,
  getSessionIndex,
  getParticipant,
  handleError,
} from "./handlers.js";

jest.mock("../logger");
describe("getHashCode, getSessionIndex", () => {
  let mockReq: any;
  let mockRes: any;
  beforeEach(() => {
    mockReq = {
      cookies: {
        idp_sid: "idp_sid1",
      },
      session: {
        id: "test-string",
      },
      user: {
        userName: "uname1",
        nameIdFormat: "nameIdFormat1",
      },
      idp: {
        options: { serviceProviderId: "serviceProviderId1", sloUrl: "sloUrl1" },
      },
    };
    mockRes = {
      render: jest.fn(),
    };
  });
  test("should get hash code for a string", () => {
    expect(getHashCode("test-string")).toEqual(-1666277972);
  });
  test("getHashCode empty string hash", () => {
    expect(getHashCode("")).toEqual(0);
  });
  test("getSessionIndex happy", () => {
    expect(getSessionIndex(mockReq)).toEqual("1666277972");
  });
  test("getSessionIndex empty string", () => {
    expect(getSessionIndex({})).toEqual(0);
  });
  test("getParticipant", () => {
    expect(getParticipant(mockReq)).toEqual({
      serviceProviderId: "serviceProviderId1",
      sessionIndex: "1666277972",
      serviceProviderLogoutURL: "sloUrl1",
      nameId: "uname1",
      nameIdFormat: "nameIdFormat1",
    });
  });
  test("handleError", () => {
    handleError(mockReq, mockRes);
    expect(mockRes.render).toHaveBeenCalledWith("sensitiveError.hbs", {
      request_id: undefined,
    });
  });
});

describe("parseSamlRequest", () => {
  let mockResponse;
  let mockRequest;
  let mockNext;
  beforeEach(() => {
    mockRequest = {
      query: {},
      session: {},
      body: {},
    };
    mockResponse = {
      render: jest.fn(),
    };
    mockNext = jest.fn();
  });
  it("parseSamlRequest Happy path", () => {
    mockRequest.body.SAMLRequest =
      "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c2FtbDJwOkF1dGhuUmVxdWVzdCBBc3NlcnRpb25Db25zdW1lclNlcnZpY2VVUkw9Imh0dHBzOi8vZGVwdHZhLWV2YWwub2t0YS5jb20vc3NvL3NhbWwyLzBvYTM3eDJjd2Y5eU90cUdiMnA3IiBEZXN0aW5hdGlvbj0iaHR0cDovL2xvY2FsaG9zdDo3MDAwL3NzbyIgRm9yY2VBdXRobj0iZmFsc2UiIElEPSJpZDE4MjMzNTA2MjM0MTUxMDQxMjAwMjE5OTMwNCIgSXNzdWVJbnN0YW50PSIyMDIxLTAyLTA5VDE5OjA4OjE2LjMzNFoiIFZlcnNpb249IjIuMCIgeG1sbnM6c2FtbDJwPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2wiPjxzYW1sMjpJc3N1ZXIgeG1sbnM6c2FtbDI9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iPmh0dHBzOi8vd3d3Lm9rdGEuY29tL3NhbWwyL3NlcnZpY2UtcHJvdmlkZXIvc3BheXF6dHB4eWZqa2V1bnhvYnc8L3NhbWwyOklzc3Vlcj48ZHM6U2lnbmF0dXJlIHhtbG5zOmRzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzA5L3htbGRzaWcjIj48ZHM6U2lnbmVkSW5mbz48ZHM6Q2Fub25pY2FsaXphdGlvbk1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMTAveG1sLWV4Yy1jMTRuIyIvPjxkczpTaWduYXR1cmVNZXRob2QgQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNyc2Etc2hhMjU2Ii8+PGRzOlJlZmVyZW5jZSBVUkk9IiNpZDE4MjMzNTA2MjM0MTUxMDQxMjAwMjE5OTMwNCI+PGRzOlRyYW5zZm9ybXM+PGRzOlRyYW5zZm9ybSBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvMDkveG1sZHNpZyNlbnZlbG9wZWQtc2lnbmF0dXJlIi8+PGRzOlRyYW5zZm9ybSBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMTAveG1sLWV4Yy1jMTRuIyIvPjwvZHM6VHJhbnNmb3Jtcz48ZHM6RGlnZXN0TWV0aG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMC8wOS94bWxkc2lnI3NoYTEiLz48ZHM6RGlnZXN0VmFsdWU+RER2UVB5UkxLdFZCSkV4VzZCc2tsTTJjYStvPTwvZHM6RGlnZXN0VmFsdWU+PC9kczpSZWZlcmVuY2U+PC9kczpTaWduZWRJbmZvPjxkczpTaWduYXR1cmVWYWx1ZT5EbUpKclVKenZWNDBUYkJ0VzJHOWN6Z1F5T1BmTVcxYlpWN0czTHpRTmNHeDIyVy9lRnpkVjJocFo5eC9hSkRKRjM4S3Y2UnVOT3NtUWprTDVLQlNBSm1aZVlPNTEzcDJFcGFzWnQwRkhXRUlFWlFOcU9KTmh6OXdDRDBUbjRnMGhPSUVNaHRCVVU2aDd5ZlJlenRkamtteWYrUzEyWVY5UytIM3J3eXlFR2lSQWhQNWpsd2ZUNkpBS3liOUgzUk5QZ0Z0MWU2MWM5MXNDc01qRlhORy9TRWdZOEVENmplbTRibUE1Y0VjeDlYRlNLZEt0MjJxVkJZRlNJTzZ5SGE5M3BmTlZ3K2ZEdTZnbkQvS2lFT21HeGxQK2lrZjVBVnhHd3gvY1BuTFBBYStwaFloYnViazNjU0dLbU9Zb0ZYeU50MlVMTmZKWUZwZU1xVVlzTnNON3c9PTwvZHM6U2lnbmF0dXJlVmFsdWU+PGRzOktleUluZm8+PGRzOlg1MDlEYXRhPjxkczpYNTA5Q2VydGlmaWNhdGU+TUlJRHRqQ0NBcDZnQXdJQkFnSUdBV1BaK3IvSE1BMEdDU3FHU0liM0RRRUJDd1VBTUlHYk1Rc3dDUVlEVlFRR0V3SlZVekVUTUJFRwpBMVVFQ0F3S1EyRnNhV1p2Y201cFlURVdNQlFHQTFVRUJ3d05VMkZ1SUVaeVlXNWphWE5qYnpFTk1Bc0dBMVVFQ2d3RVQydDBZVEVVCk1CSUdBMVVFQ3d3TFUxTlBVSEp2ZG1sa1pYSXhIREFhQmdOVkJBTU1FMlJsY0hSMllTMTJaWFJ6WjI5MkxXVjJZV3d4SERBYUJna3EKaGtpRzl3MEJDUUVXRFdsdVptOUFiMnQwWVM1amIyMHdIaGNOTVRnd05qQTNNVEV5TURFNVdoY05Namd3TmpBM01URXlNVEU0V2pDQgptekVMTUFrR0ExVUVCaE1DVlZNeEV6QVJCZ05WQkFnTUNrTmhiR2xtYjNKdWFXRXhGakFVQmdOVkJBY01EVk5oYmlCR2NtRnVZMmx6ClkyOHhEVEFMQmdOVkJBb01CRTlyZEdFeEZEQVNCZ05WQkFzTUMxTlRUMUJ5YjNacFpHVnlNUnd3R2dZRFZRUUREQk5rWlhCMGRtRXQKZG1WMGMyZHZkaTFsZG1Gc01Sd3dHZ1lKS29aSWh2Y05BUWtCRmcxcGJtWnZRRzlyZEdFdVkyOXRNSUlCSWpBTkJna3Foa2lHOXcwQgpBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFsYm52czYwN2thOEN2ekRFS0RIUFJWN1hvd2o4SkUveVN2RmtKRENGaWZjZ28wMlIvTEE3CkM5RHVLN20vS0l2dU9WakRWZ0JaVUlWeHNGeFQvRnBsc2ZEcDJDK3FJbVFmKzRvb0p1dTZhci9xTW9JZmRUbEN1TjRjV2F4L0cxWGQKMFFNOFpqSjVEbVJWcW1aNk91NTFld29jYWlrS20yS2E2dmhQTUdPVGdUa3V2YnJBRXRTczdMcFRoWjJydHRsb044ZkJsSk1yOFFidAp0YjNFaEV1cWtVRExjNEJkTVYxenRzcFlTbDhIZ1NlLy9tS2JVazNkcldMRFhZZU02YXdRWk9NTzFJVzJpTnpHQk5UcjBqWDBPVXNoCjRjczgvRXpHaFFsbGlYU0hmZHNrTEpGSjMycjVmM1BmdTc5Sks3ZGdUd3c1SkZWeG9OWjJkZUEwenhnU2FRSURBUUFCTUEwR0NTcUcKU0liM0RRRUJDd1VBQTRJQkFRQVpJL1dpSUpON2FScXRWaXd6S2ZXTHYvbWF0dzMrdXFFWjdBU0dDZXZPV2tEdnhFMk9qME5RZllHbgpRZllOYkszR1I5bWtUdjVyOTE1aE41SmJKTERFVTZLcVZzdzlFRW5GZ1RTd1NOd014NnY5Q3craEdFS3dTbURzbnoxaXgzUjJ6Q2lWCmZtd3NzeUpiRlRiQk9PeW5NZE43RTVpWnBwZ21IejBuZThkbE15NEh0bm05WnNCN001ejJyaU9QUUxCUzVXSHFPeVlyTDNHOHhNT0wKVkMvK2hycWNDRVRsUDZtei9iWjhsa28xZFFpcm9NU1ROQ0U5UEtpQ3V2bk9IZWxndm9NMmR4RmE1SUc5eVBlNlA4NGFHS0FBb0hjbQpkS2NOY0NjRnluOXJpRW14WWZVbnZLdllzbGw2MGY0dkZIblJ3L1RzbGIwcXZqVXBZQlNBUWhhSjwvZHM6WDUwOUNlcnRpZmljYXRlPjwvZHM6WDUwOURhdGE+PC9kczpLZXlJbmZvPjwvZHM6U2lnbmF0dXJlPjxzYW1sMnA6TmFtZUlEUG9saWN5IEZvcm1hdD0idXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6MS4xOm5hbWVpZC1mb3JtYXQ6dW5zcGVjaWZpZWQiLz48L3NhbWwycDpBdXRoblJlcXVlc3Q+";
    parseSamlRequest(mockRequest, mockResponse, mockNext);
    expect(mockNext).toBeCalled();
    expect(mockRequest.authnRequest).toEqual({
      relayState: undefined,
      id: "id182335062341510412002199304",
      issuer:
        "https://www.okta.com/saml2/service-provider/spayqztpxyfjkeunxobw",
      destination: "http://localhost:7000/sso",
      acsUrl: "https://deptva-eval.okta.com/sso/saml2/0oa37x2cwf9yOtqGb2p7",
      forceAuthn: false,
    });
  });
  it("parseSamlRequest no session", () => {
    mockRequest.session = undefined;
    mockRequest.body.SAMLRequest =
      "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c2FtbDJwOkF1dGhuUmVxdWVzdCBBc3NlcnRpb25Db25zdW1lclNlcnZpY2VVUkw9Imh0dHBzOi8vZGVwdHZhLWV2YWwub2t0YS5jb20vc3NvL3NhbWwyLzBvYTM3eDJjd2Y5eU90cUdiMnA3IiBEZXN0aW5hdGlvbj0iaHR0cDovL2xvY2FsaG9zdDo3MDAwL3NzbyIgRm9yY2VBdXRobj0iZmFsc2UiIElEPSJpZDE4MjMzNTA2MjM0MTUxMDQxMjAwMjE5OTMwNCIgSXNzdWVJbnN0YW50PSIyMDIxLTAyLTA5VDE5OjA4OjE2LjMzNFoiIFZlcnNpb249IjIuMCIgeG1sbnM6c2FtbDJwPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2wiPjxzYW1sMjpJc3N1ZXIgeG1sbnM6c2FtbDI9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iPmh0dHBzOi8vd3d3Lm9rdGEuY29tL3NhbWwyL3NlcnZpY2UtcHJvdmlkZXIvc3BheXF6dHB4eWZqa2V1bnhvYnc8L3NhbWwyOklzc3Vlcj48ZHM6U2lnbmF0dXJlIHhtbG5zOmRzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzA5L3htbGRzaWcjIj48ZHM6U2lnbmVkSW5mbz48ZHM6Q2Fub25pY2FsaXphdGlvbk1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMTAveG1sLWV4Yy1jMTRuIyIvPjxkczpTaWduYXR1cmVNZXRob2QgQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNyc2Etc2hhMjU2Ii8+PGRzOlJlZmVyZW5jZSBVUkk9IiNpZDE4MjMzNTA2MjM0MTUxMDQxMjAwMjE5OTMwNCI+PGRzOlRyYW5zZm9ybXM+PGRzOlRyYW5zZm9ybSBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvMDkveG1sZHNpZyNlbnZlbG9wZWQtc2lnbmF0dXJlIi8+PGRzOlRyYW5zZm9ybSBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMTAveG1sLWV4Yy1jMTRuIyIvPjwvZHM6VHJhbnNmb3Jtcz48ZHM6RGlnZXN0TWV0aG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMC8wOS94bWxkc2lnI3NoYTEiLz48ZHM6RGlnZXN0VmFsdWU+RER2UVB5UkxLdFZCSkV4VzZCc2tsTTJjYStvPTwvZHM6RGlnZXN0VmFsdWU+PC9kczpSZWZlcmVuY2U+PC9kczpTaWduZWRJbmZvPjxkczpTaWduYXR1cmVWYWx1ZT5EbUpKclVKenZWNDBUYkJ0VzJHOWN6Z1F5T1BmTVcxYlpWN0czTHpRTmNHeDIyVy9lRnpkVjJocFo5eC9hSkRKRjM4S3Y2UnVOT3NtUWprTDVLQlNBSm1aZVlPNTEzcDJFcGFzWnQwRkhXRUlFWlFOcU9KTmh6OXdDRDBUbjRnMGhPSUVNaHRCVVU2aDd5ZlJlenRkamtteWYrUzEyWVY5UytIM3J3eXlFR2lSQWhQNWpsd2ZUNkpBS3liOUgzUk5QZ0Z0MWU2MWM5MXNDc01qRlhORy9TRWdZOEVENmplbTRibUE1Y0VjeDlYRlNLZEt0MjJxVkJZRlNJTzZ5SGE5M3BmTlZ3K2ZEdTZnbkQvS2lFT21HeGxQK2lrZjVBVnhHd3gvY1BuTFBBYStwaFloYnViazNjU0dLbU9Zb0ZYeU50MlVMTmZKWUZwZU1xVVlzTnNON3c9PTwvZHM6U2lnbmF0dXJlVmFsdWU+PGRzOktleUluZm8+PGRzOlg1MDlEYXRhPjxkczpYNTA5Q2VydGlmaWNhdGU+TUlJRHRqQ0NBcDZnQXdJQkFnSUdBV1BaK3IvSE1BMEdDU3FHU0liM0RRRUJDd1VBTUlHYk1Rc3dDUVlEVlFRR0V3SlZVekVUTUJFRwpBMVVFQ0F3S1EyRnNhV1p2Y201cFlURVdNQlFHQTFVRUJ3d05VMkZ1SUVaeVlXNWphWE5qYnpFTk1Bc0dBMVVFQ2d3RVQydDBZVEVVCk1CSUdBMVVFQ3d3TFUxTlBVSEp2ZG1sa1pYSXhIREFhQmdOVkJBTU1FMlJsY0hSMllTMTJaWFJ6WjI5MkxXVjJZV3d4SERBYUJna3EKaGtpRzl3MEJDUUVXRFdsdVptOUFiMnQwWVM1amIyMHdIaGNOTVRnd05qQTNNVEV5TURFNVdoY05Namd3TmpBM01URXlNVEU0V2pDQgptekVMTUFrR0ExVUVCaE1DVlZNeEV6QVJCZ05WQkFnTUNrTmhiR2xtYjNKdWFXRXhGakFVQmdOVkJBY01EVk5oYmlCR2NtRnVZMmx6ClkyOHhEVEFMQmdOVkJBb01CRTlyZEdFeEZEQVNCZ05WQkFzTUMxTlRUMUJ5YjNacFpHVnlNUnd3R2dZRFZRUUREQk5rWlhCMGRtRXQKZG1WMGMyZHZkaTFsZG1Gc01Sd3dHZ1lKS29aSWh2Y05BUWtCRmcxcGJtWnZRRzlyZEdFdVkyOXRNSUlCSWpBTkJna3Foa2lHOXcwQgpBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFsYm52czYwN2thOEN2ekRFS0RIUFJWN1hvd2o4SkUveVN2RmtKRENGaWZjZ28wMlIvTEE3CkM5RHVLN20vS0l2dU9WakRWZ0JaVUlWeHNGeFQvRnBsc2ZEcDJDK3FJbVFmKzRvb0p1dTZhci9xTW9JZmRUbEN1TjRjV2F4L0cxWGQKMFFNOFpqSjVEbVJWcW1aNk91NTFld29jYWlrS20yS2E2dmhQTUdPVGdUa3V2YnJBRXRTczdMcFRoWjJydHRsb044ZkJsSk1yOFFidAp0YjNFaEV1cWtVRExjNEJkTVYxenRzcFlTbDhIZ1NlLy9tS2JVazNkcldMRFhZZU02YXdRWk9NTzFJVzJpTnpHQk5UcjBqWDBPVXNoCjRjczgvRXpHaFFsbGlYU0hmZHNrTEpGSjMycjVmM1BmdTc5Sks3ZGdUd3c1SkZWeG9OWjJkZUEwenhnU2FRSURBUUFCTUEwR0NTcUcKU0liM0RRRUJDd1VBQTRJQkFRQVpJL1dpSUpON2FScXRWaXd6S2ZXTHYvbWF0dzMrdXFFWjdBU0dDZXZPV2tEdnhFMk9qME5RZllHbgpRZllOYkszR1I5bWtUdjVyOTE1aE41SmJKTERFVTZLcVZzdzlFRW5GZ1RTd1NOd014NnY5Q3craEdFS3dTbURzbnoxaXgzUjJ6Q2lWCmZtd3NzeUpiRlRiQk9PeW5NZE43RTVpWnBwZ21IejBuZThkbE15NEh0bm05WnNCN001ejJyaU9QUUxCUzVXSHFPeVlyTDNHOHhNT0wKVkMvK2hycWNDRVRsUDZtei9iWjhsa28xZFFpcm9NU1ROQ0U5UEtpQ3V2bk9IZWxndm9NMmR4RmE1SUc5eVBlNlA4NGFHS0FBb0hjbQpkS2NOY0NjRnluOXJpRW14WWZVbnZLdllzbGw2MGY0dkZIblJ3L1RzbGIwcXZqVXBZQlNBUWhhSjwvZHM6WDUwOUNlcnRpZmljYXRlPjwvZHM6WDUwOURhdGE+PC9kczpLZXlJbmZvPjwvZHM6U2lnbmF0dXJlPjxzYW1sMnA6TmFtZUlEUG9saWN5IEZvcm1hdD0idXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6MS4xOm5hbWVpZC1mb3JtYXQ6dW5zcGVjaWZpZWQiLz48L3NhbWwycDpBdXRoblJlcXVlc3Q+";
    parseSamlRequest(mockRequest, mockResponse, mockNext);
    expect(mockNext).toBeCalled();
    expect(mockRequest.authnRequest).toEqual({
      relayState: undefined,
      id: "id182335062341510412002199304",
      issuer:
        "https://www.okta.com/saml2/service-provider/spayqztpxyfjkeunxobw",
      destination: "http://localhost:7000/sso",
      acsUrl: "https://deptva-eval.okta.com/sso/saml2/0oa37x2cwf9yOtqGb2p7",
      forceAuthn: false,
    });
  });
});

describe("samlLogin", () => {
  let mockResponse;
  let mockRequest;
  let mockNext;

  beforeEach(() => {
    mockResponse = {
      render: jest.fn(),
    };

    mockRequest = {
      sessionID: "sessionID",
      query: {
        acsUrl: "url",
      },
      sp: {
        options: {
          getResponseParams: () => {
            return {
              thumbprint: "thumbprint",
            };
          },
          getAuthnRequestParams: () => {
            return {
              identityProviderUrl: "https://identityProviderUrl.com",
              id_me_login_link:
                "https://api.idmelabs.com/saml/SingleSignOnService?SAMLRequest=fVJNTwIxED37Lza9s13BaGxYAoGYkOBHQD14G8sITfqxdmYR%2F73dZSEc1GQP3c57M%2B%2B96ZDA2UpNat76JX7WSJztnfWk2kIp6uhVADKkPDgkxVqtJvcL1c8LVcXAQQcrzij%2FM4AII5vgRTaflWI8ns%2FG43QmqnHuicFzKfpFv%2BgVt71i8Hx5ra7Sd%2FsmsovJkTsNnmqHcYVxZzS%2BLBel2DJXSkobNNhtIFY3RVHI1kMM%2B29JVfsjiYK4mCWXxkPT68CkRIXK5Gbt0MI75Tq4A35l%2FMbiymz8o%2B%2FmiewVI7XcZElkdyFqbAMsBccaxWjYUFVrKo5OGvIdbMIuX%2BNuKM8Bw8MKHlJY89lTsEZ%2FNz0d8P9ZNjdm3ftooapqNBGjZ5FNrA1f04jA2EmSxyndjnHdCk5JMu45mwZXQTTUeMI9aD56OEdNbdreEj9GXdYpLPCwQZdm5smZ9CQToo7gNaZNgBx0Rn%2Ftcqj9oehUPX%2BYox8%3D&RelayState=%2F&SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256&Signature=crqsP27LiAeJpKx7%2Bjshr4OeqHvFnp1rYmkP4rHTYXdEIjp6iIo7Zu3uwzXfkm%2BJp0ShXPAy7R6855y1dMBmOz3eVjdvdm8rQ7%2B044hTw3Cxmcuf836up4rsKLeT4vIHc3%2FA3qtDK3ut%2FXiArNLZJ%2FwOrC6KNWAuhJQ8fZIPv18uiCw1eNBJA2iCUD6KKtI%2FDgwA%2B1MtpRCsHNcpX23XQryIPkH8l6MsRDw1ZM3vttF7UZa6OkIsxFEXFJ4VZMal%2BciNZV%2FiB0%2FK3QvmbbKX8k%2BuJKL8rmIJr0XhNw%2BYLcMTNnpL%2FTQloi0xS18gu3J6GY%2BTEsG1CeJRNHkuJyF3LQ%3D%3D",
              dslogon_login_link:
                "https://api.idmelabs.com/saml/SingleSignOnService?SAMLRequest=fVLLboMwEDznL5DvAZpWrWIFRASqhJQ%2BlLQ99ObCJrFkvNS7pMnfF8hDHNpIPtjeGe%2FMrGekKlPLecNbu4TvBoi9fWUsyb4QicZZiYo0SasqIMmFXM2fFnLih7J2yFigEQPKdYYiAscarfDyLBJJkmdJ0u6JGsgtsbIciUk4CcfhdBzevt3cy7t2TT%2BFN5qfuSlaaipwK3A7XcD7chGJLXMtg8BgocwWieVDGIZB78Hh%2FhBQ3R8CIhSjrHWprereOjKppapa%2B7qswKgv8gusjviVthsDK72xL%2FbUT3gf4KjntpaE94iugD7ASLBrQMSzjip7Uy6%2BaPB3aoM7v4TdLBgCZscRPLdh5dkrGl0cujcrxdez7G50OV73UFl3mojBsvDmxuBP6kAxnCQF5y6nGUPZC26TZNizl2JVK6ep8wR7VfDZwxCVmnZ6S1jHJRncoD25%2BBNyrP3T7lId%2Frr4Fw%3D%3D&RelayState=%2F&SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256&Signature=bkKD3IEEtf7GErOTAkv6iYxgQF9UGcg1M%2BrZvuMvRXzaSz9Y2uQSWfsYT7m4x0ZU1JbNYsavwHLxAT%2BjwxcMSriLg4ywT0oa50dMwIlKih9IlUJgRvxHXsDYR8s%2B%2F%2BqH6JZYgCJO%2Fmxbam2UMJTqAn3MkheVXxMTCVNRre5%2FL56Eh8EEsf8j%2F9BqUIMA8kxlCgiOoC08nr0%2FEx6kmBYdvywat4RE7jiFKT1lce3U4t0n28fOu%2BfrQCyvtaRZoIMRGIRWxtLh5CaSU6jn%2Fwvfzei45%2FxWHW5W2noUDjCXbIDr4QMUNl5aePQn5jOVWYeNdkyp4CTq1%2FgyFsXW1k3M3A%3D%3D",
              mvh_login_link:
                "https://api.idmelabs.com/saml/SingleSignOnService?SAMLRequest=fVLLbsIwEDzzF5HvJCmtWmERFERUKRJ9iLQ99OYmC7HkR%2BrdpOHvmwcgDi2SD7Z3xjsz6wUKrSq%2Bqqk0W%2FiuAclrtTLIh0LEame4FSiRG6EBOeU8Wz1t%2BMwPeeUs2dwqdkG5zhCI4Ehaw7w0iVgcp0kcd3vEGlKDJAxFbBbOwmk4n4a3bzf3%2FK5b80%2FmTVYn7toarDW4DFwjc3jfbiJWElU8CJTNhSotEn8IwzAYPDjbHgKshkOAaNkk6VxKI%2Fq3RiZ2VFFJXxYalPhCP7d6xGfS7BVkcm9ezLEf8z7A4cDtLDHv0bochgAjRq4Gtlz0VD6YcsuzBr8Re9v4BTSL4BKwGEfw3IWVJq9WyfzQv6kFXc%2Byv5HFdDdAedVrQgJDzFspZX%2FWDgTBUVJw6nKcMRSD4C5Jgpa8tdWVcBJ7T9CKnE4eLlFr1U1vC7ulPpQgFJXQAB2t%2FIkba%2F%2F0PFcvv97yFw%3D%3D&RelayState=%2F&SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256&Signature=AtPbhLpittfvJLCw19J3u8Vq6UvBG7maFggSQM6vCTKCdB%2FAhCXk0P0drEk4OS0RNk2dZ8yVOfTeJ85874Re5VL%2BRKiUDd751U0VhSdlVkz%2Bl%2BeCmK%2FJzq8%2F9G5tgwjJbBk2Z6WBQlSspsfYBUetm%2B77NfI%2BPHjiusVXelk7t6cKAXV81YHyuwCgXaw2Y%2BxeUS8pna5W4zult1V4vE0YLpSyOnQbAeGLXygqmcuSlm%2BR0%2BTZsatYEve%2BubTxCXy58gE8ab3VhSjuasu%2BLiby8kJUpF95Shuhv58YyDYRx%2BtgJ9%2BDBit%2F4vB5MkvhYpDpIYXpYxBPo%2Ftv2fSqmLjU1Q%3D%3D",
            };
          },
        },
      },
      authnRequest: {},
      get: (param) => {
        return param;
      },
    };

    mockNext = jest.fn();
  });
  afterAll(() => {
    expect(mockResponse.render).toHaveBeenCalledWith("login_selection", {
      id_me_login_link:
        "https://identityProviderUrl.com?SAMLRequest=fVDBqsJADDz7F2Xvte0KCsEWFA8KiuXZ9w7e1rroQputm1T0711XD76LOU3IzCSTKam26WDW8xl%2F9KXXxNGtbZAgDHLROwSryBCgajUB17CbbdYghyl0zrKtbSMiX4OF1xpUbCzm4szcESSJOWpkw%2FfS2avH7tc1w9q2QbFa5OIFiHq9QmKFnAuZyixOx3E2qWQGWQojuQ%2B08r1ubvBo8PT9tsOLRLCsqjIut7tKRH%2FaUbjOE0QxfSaEsNt9ZP5uq4i0e0b0%2BuTD4N39%2F2TxAA%3D%3D&RelayState=",
      dslogon_login_link:
        "https://identityProviderUrl.com?SAMLRequest=fVDLCsJADDz7F2XvtQ9BIdiC4kFBsWj14G2tiy602bpJRf%2FedfWgF3OakJlJJmOSTd3CpOMLbtS1U8TBvamRwA8y0VkEI0kToGwUAVewnayWkPZjaK1hU5laBK56M6fVKFkbzMSFuSWIIn1SyJofhTU3h%2B3O1v3KNF6xmGXiDYg6tUBiiZyJNE6TMB6GyahME0hiGAwOnlZ81k01njSe%2F992fJMI5mVZhMV6W4pgryz56xxB5ONXQvC77Vfm%2F7aSSNlXRKePvgw%2B3e8n8yc%3D&RelayState=",
      mhv_login_link:
        "https://identityProviderUrl.com?SAMLRequest=fVDLCsJADDz7F2XvtQ9BIdiC4kFBsWj14G2tiy602bpJRf%2FedfWgF3OakJlJJmOSTd3CpOMLbtS1U8TBvamRwA8y0VkEI0kToGwUAVewnayWkPZjaK1hU5laBK56M6fVKFkbzMSFuSWIIn1SyJofhTU3h%2B3O1v3KNF6xmGXiDYg6tUBiiZyJNE6TMB6GyahME0hiGAwOnlZ81k01njSe%2F992fJMI5mVZhMV6W4pgryz56xxB5ONXQvC77Vfm%2F7aSSNlXRKePvgw%2B3e8n8yc%3D&RelayState=",
      id_me_signup_link:
        "https://identityProviderUrl.com?SAMLRequest=fVDLCsJADDz7F2XvtQ9BIdiC4kFBsWj14G2tiy602bpJRf%2FedfWgF3OakJlJJmOSTd3CpOMLbtS1U8TBvamRwA8y0VkEI0kToGwUAVewnayWkPZjaK1hU5laBK56M6fVKFkbzMSFuSWIIn1SyJofhTU3h%2B3O1v3KNF6xmGXiDYg6tUBiiZyJNE6TMB6GyahME0hiGAwOnlZ81k01njSe%2F992fJMI5mVZhMV6W4pgryz56xxB5ONXQvC77Vfm%2F7aSSNlXRKePvgw%2B3e8n8yc%3D&RelayState=&op=signup",
    });
    expect(mockResponse.render).toHaveBeenCalledWith("verify", {
      id_me_login_link:
        "https://identityProviderUrl.com?SAMLRequest=fVDBqsJADDz7F2Xvte2KCMEWFA8KiuXZ9w7e1rroQputm1T0711XD76LOU3IzCSTKam26WDW8xl%2F9KXXxNGtbZAgDHLROwSryBCgajUB17CbbdYghyl0zrKtbSMiX4OF1xpUbCzm4szcESSJOWpkw%2FfS2avH7tc1w9q2QbFa5OIFiHq9QmKFnAuZyixOZZxNqmwE4xRktg%2B08r1ubvBo8PT9tsOLRLCsqjIut7tKRH%2FaUbjOE0QxfSaEsNt9ZP5uq4i0e0b0%2BuTD4N39%2F2TxAA%3D%3D&RelayState=",
      dslogon_login_link:
        "https://identityProviderUrl.com?SAMLRequest=fVDBbsIwDD3zF1XupW3QNMmiSJ04DImJCsoO3LI2GpFap8QuGn9PSDl0F3x6lt979vOSVNf2UAx8xr2%2BDJo4%2ButaJAiDXAwOwSoyBKg6TcA1HIqvLch5Cr2zbGvbisjXbO21BhUbi7k4M%2FcESWIajWz4Vjp79dgdXTuvbRcUm3UuRkA06A0SK%2BRcyFRmcSrj7L3KFvCWglycAq18rvsw2Bj8fX3bz0gi%2BKyqMi53h0pE39pRuM4TxGr5SAhht5tkfm2riLR7RPT6ZGLw7P5%2FcnUH&RelayState=",
      mhv_login_link:
        "https://identityProviderUrl.com?SAMLRequest=fVDBbsIwDD3zF1XupW3QNMmiSJ04DImJCsoO3LI2GpFap8QuGn9PSDl0F3x6lt979vOSVNf2UAx8xr2%2BDJo4%2ButaJAiDXAwOwSoyBKg6TcA1HIqvLch5Cr2zbGvbisjXbO21BhUbi7k4M%2FcESWIajWz4Vjp79dgdXTuvbRcUm3UuRkA06A0SK%2BRcyFRmcSrj7L3KFvCWglycAq18rvsw2Bj8fX3bz0gi%2BKyqMi53h0pE39pRuM4TxGr5SAhht5tkfm2riLR7RPT6ZGLw7P5%2FcnUH&RelayState=",
      id_me_signup_link:
        "https://identityProviderUrl.com?SAMLRequest=fVDBbsIwDD3zF1XupW3QNMmiSJ04DImJCsoO3LI2GpFap8QuGn9PSDl0F3x6lt979vOSVNf2UAx8xr2%2BDJo4%2ButaJAiDXAwOwSoyBKg6TcA1HIqvLch5Cr2zbGvbisjXbO21BhUbi7k4M%2FcESWIajWz4Vjp79dgdXTuvbRcUm3UuRkA06A0SK%2BRcyFRmcSrj7L3KFvCWglycAq18rvsw2Bj8fX3bz0gi%2BKyqMi53h0pE39pRuM4TxGr5SAhht5tkfm2riLR7RPT6ZGLw7P5%2FcnUH&RelayState=&op=signup",
    });
  });

  it("Happy Path", async () => {
    mockRequest.authnRequest = {
      relayState: "theRelayState",
    };
    const doLogin = samlLogin("login_selection");
    try {
      doLogin(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    } catch (err) {
      fail("Should not reach here");
    }
  });

  it("Happy Path, no authnRequest", async () => {
    mockRequest.authnRequest = null;
    mockRequest.query.RelayState = "theRelayState";
    const doLogin = samlLogin("verify");
    try {
      doLogin(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    } catch (err) {
      fail("Should not reach here");
    }
  });

  it("Login requests with a null relay state should throw an error", async () => {
    let thrownError;
    mockRequest.authnRequest = {
      relayState: null,
    };
    try {
      samlLogin("login_selection")(mockRequest, mockResponse, mockNext);
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError.message).toEqual(
      "Error: Empty relay state. Invalid request."
    );
  });
  it("Redirect request to the verify request with a null relay state should throw an error", async () => {
    let thrownError;
    mockRequest.authnRequest = {
      relayState: null,
    };
    try {
      samlLogin("verify")(mockRequest, mockResponse, mockNext);
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError.message).toEqual(
      "Error: Empty relay state during verify. Invalid request."
    );
  });
  it("Login requests with an empty relay state should throw an error", async () => {
    let thrownError;
    mockRequest.authnRequest = {
      relayState: "",
    };
    try {
      samlLogin("login_selection")(mockRequest, mockResponse, mockNext);
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError.message).toEqual(
      "Error: Empty relay state. Invalid request."
    );
  });
  it("SAML logins with empty requests should throw an error", async () => {
    let thrownError;
    mockRequest = null;
    try {
      samlLogin("login_selection")(mockRequest, mockResponse, mockNext);
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError).toBeDefined();
  });
});
