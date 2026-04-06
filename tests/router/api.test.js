const express = require("express");
const request = require("supertest");

describe("api router", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  function loadApp() {
    const userController = {
      getUser: jest.fn((req, res) => res.json({ route: "getUser" })),
      register: jest.fn((req, res) => res.status(201).json({ route: "register" })),
      login: jest.fn((req, res) => res.json({ route: "login" })),
      logout: jest.fn((req, res) => res.json({ route: "logout" })),
      getOneRecord: jest.fn((req, res) =>
        res.json({ route: "getOneRecord", recordId: req.params.recordId }),
      ),
      myRecords: jest.fn((req, res) => res.json({ route: "myRecords" })),
      mySummary: jest.fn((req, res) => res.json({ route: "mySummary" })),
    };

    const adminController = {
      getAllUsers: jest.fn((req, res) => res.json({ route: "getAllUsers" })),
      getAllAdmins: jest.fn((req, res) => res.json({ route: "getAllAdmins" })),
      getAllRecords: jest.fn((req, res) => res.json({ route: "getAllRecords" })),
      createRecord: jest.fn((req, res) => res.status(201).json({ route: "createRecord" })),
      updateRecord: jest.fn((req, res) =>
        res.status(201).json({ route: "updateRecord", id: req.params.id }),
      ),
      deleteRecord: jest.fn((req, res) =>
        res.json({ route: "deleteRecord", id: req.params.id }),
      ),
      summary: jest.fn((req, res) =>
        res.json({ route: "summary", userId: req.params.userId }),
      ),
    };

    const auth = jest.fn((req, res, next) => {
      req.user = { id: "user-1", email: "user@example.com", role: "admin" };
      next();
    });
    const adminAuth = jest.fn((req, res, next) => next());

    jest.doMock("../../dist/controller/user", () => ({
      __esModule: true,
      default: userController,
    }));
    jest.doMock("../../dist/controller/admin", () => ({
      __esModule: true,
      default: adminController,
    }));
    jest.doMock("../../dist/middleware/auth", () => ({
      auth,
      adminAuth,
    }));

    const apiRouter = require("../../dist/router/api").default;
    const app = express();
    app.use(express.json());
    app.use(apiRouter);

    return { app, userController, adminController, auth, adminAuth };
  }

  test("GET /health returns service health", async () => {
    const { app, auth, adminAuth } = loadApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: "true" });
    expect(auth).not.toHaveBeenCalled();
    expect(adminAuth).not.toHaveBeenCalled();
  });

  test("GET /current-user applies auth and calls getUser", async () => {
    const { app, userController, auth } = loadApp();

    const response = await request(app).get("/current-user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: "getUser" });
    expect(auth).toHaveBeenCalledTimes(1);
    expect(userController.getUser).toHaveBeenCalledTimes(1);
  });

  test("admin routes apply both auth middlewares before controller", async () => {
    const { app, adminController, auth, adminAuth } = loadApp();

    const usersResponse = await request(app).get("/users");
    const recordsResponse = await request(app).post("/create-record").send({});

    expect(usersResponse.status).toBe(200);
    expect(recordsResponse.status).toBe(201);
    expect(auth).toHaveBeenCalledTimes(2);
    expect(adminAuth).toHaveBeenCalledTimes(2);
    expect(adminController.getAllUsers).toHaveBeenCalledTimes(1);
    expect(adminController.createRecord).toHaveBeenCalledTimes(1);
  });

  test("record and summary routes forward params to handlers", async () => {
    const { app, userController, adminController } = loadApp();

    const recordResponse = await request(app).get("/record/abc123");
    const summaryResponse = await request(app).get("/summary/user-42");

    expect(recordResponse.status).toBe(200);
    expect(recordResponse.body).toEqual({
      route: "getOneRecord",
      recordId: "abc123",
    });
    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body).toEqual({
      route: "summary",
      userId: "user-42",
    });
    expect(userController.getOneRecord).toHaveBeenCalledTimes(1);
    expect(adminController.summary).toHaveBeenCalledTimes(1);
  });
});
