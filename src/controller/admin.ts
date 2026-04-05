import { Request, Response } from "express";
import userModel from "../model/user";
import recordModel from "../model/record";
import dayjs from "dayjs";
import { MyJwtPayload } from "../types/auth";

const getAllUsers = async (req: Request, res: Response) => {
  try {
    const filter = {
      _id: 0,
      id: "$_id",
      username: 1,
      email: 1,
      lastSeen: 1,
      status: 1,
    };
    const users = await userModel.aggregate([
      { $match: { role: "user" } },
      {
        $project: filter,
      },
    ]);
    res.json({ users });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const filter = {
      _id: 0,
      id: "$_id",
      username: 1,
      email: 1,
      lastSeen: 1,
      status: 1,
    };
    const admins = await userModel.aggregate([
      { $match: { role: "admin" } },
      {
        $project: filter,
      },
    ]);
    res.json({ admins });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAllRecords = async (req: Request, res: Response) => {
  try {
    let filters: Record<string, string | {}> = {};
    if (req.query) {
      const { date, type, category } = req.query;
      if (type) filters.type = type.toString();
      if (category) filters.category = category.toString();
      if (date) {
        if (!dayjs(date.toString(), "YYYY-MM-DD", true).isValid()) {
          return res
            .status(400)
            .json({ error: "Bad request (Invalid date format)" });
        }
        const st = dayjs(date.toString()).startOf("day").toDate();
        const end = dayjs(date.toString()).endOf("day").toDate();
        filters.date = { $gt: st, $lt: end };
      }
    }
    const records = await recordModel.aggregate([
      { $match: filters },
      {
        $project: {
          _id: 0,
          id: "$_id",
          userId: 1,
          amount: 1,
          type: 1,
          date: 1,
          category: 1,
          description: 1,
          createdBy: 1,
        },
      },
    ]);
    return res.json({ records });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const createRecord = async (req: Request, res: Response) => {
  try {
    const { userId, amount, type, date, category, description } = req.body;
    const { id: admin } = req.user as MyJwtPayload;
    if (!userId || !amount || !type || !category || !description) {
      return res.status(400).json({
        message:
          "Bad Request (userId, amount, type, date, category, description is/are missing)",
      });
    }
    if (userId.length !== 24) {
      return res.status(400).json({
        message: `Invalid id (id should be of 24 characters, but found ${userId.length})`,
      });
    }
    if (date) {
      if (!dayjs(date.toString(), "YYYY-MM-DD", true).isValid()) {
        return res
          .status(400)
          .json({ error: "Bad request (Invalid date format)" });
      }
    }
    const record = new recordModel({
      userId,
      amount,
      type,
      date,
      category,
      description,
      createdBy: admin,
    });
    await record.save();
    return res.status(201).json({ message: "Record created successfully!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateRecord = async (req: Request, res: Response) => {
  const { id: admin } = req.user as MyJwtPayload;
  const { id } = req.params;
  if (id.length !== 24)
    return res.status(400).json({
      message: `Invalid id (id should be of 24 characters, but found ${id.length})`,
    });
  try {
    if (!req.body)
      return res
        .status(400)
        .json({ message: `Bad request (body expected but found nothing)` });
    const { amount, type, date, category, description, userId } = req.body;
    const record = await recordModel.findById(id);
    if (!record)
      return res
        .status(404)
        .json({ message: `Not found (cannot find record with the id: ${id})` });
    if (amount) record.amount = amount;
    if (type) record.type = type;
    if (date) record.date = date;
    if (category) record.category = category;
    if (description) record.description = description;
    if (userId) record.userId = userId;
    record.createdBy = admin;
    await record.save();
    return res.status(201).json({ message: "Record updated successfully!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteRecord = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (id.length !== 24)
    return res.status(400).json({
      message: `Invalid id (id should be of 24 characters, but found ${id.length})`,
    });
  try {
    const record = await recordModel.findByIdAndDelete(id);
    if (!record) {
      return res
        .status(404)
        .json({ message: `Not found (cannot find record with id: ${id})` });
    }
    return res.json({ message: "Deleted Successfully!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const adminController = {
  getAllUsers,
  getAllAdmins,
  getAllRecords,
  createRecord,
  updateRecord,
  deleteRecord,
};
export default adminController;
