import { Request, Response } from "express";
import userModel from "../model/user";
import recordModel from "../model/record";
import dayjs from "dayjs";

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

const createRecord = async (req: Request, res: Response) => {
  try {
    const { amount, type, date, category, description } = req.body;
    if (!amount || !type || !category || !description) {
      return res.status(400).json({
        message:
          "Bad Request (amount, type, date, category, description is/are missing)",
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
      amount,
      type,
      date,
      category,
      description,
    });
    await record.save();
    return res.status(201).json({ message: "Record created successfully!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateRecord = async (req: Request, res: Response) => {
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
    const { amount, type, date, category, description } = req.body;
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
  createRecord,
  updateRecord,
  deleteRecord,
};
export default adminController;
