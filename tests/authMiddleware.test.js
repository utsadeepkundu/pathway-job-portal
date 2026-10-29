
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  authenticateToken,
  authorizeRoles
} = require("../src/middleware/authMiddleware");

function createResponse() {
  return {
    statusCode: 200,
    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test("student cannot access recruiter-only resources", () => {
  const req = {
    user: { id: 1, role: "student" }
  };

  const res = createResponse();
  let nextCalled = false;

  authorizeRoles("recruiter")(
    req,
    res,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
  assert.equal(res.body.success, false);
});

test("recruiter can access recruiter-only resources", () => {
  const req = {
    user: { id: 2, role: "recruiter" }
  };

  const res = createResponse();
  let nextCalled = false;

  authorizeRoles("recruiter")(
    req,
    res,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test("requests without a token are rejected", () => {
  const req = {
    headers: {}
  };

  const res = createResponse();
  let nextCalled = false;

  authenticateToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
  assert.equal(
    res.body.message,
    "Authentication token is required"
  );
});
