import { Booking } from '../models/Booking.js';
import Joi from 'joi';
// TODO: write a validation schema for create/update per README.md section 2.


const createSchema = Joi.object({
  roomNumber: Joi.string().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  purpose: Joi.string().optional().allow(''),
  bookedBy: Joi.string().optional()
});

const updateSchema = Joi.object({
  roomNumber: Joi.string(),
  startDate: Joi.date(),
  endDate: Joi.date(),
  purpose: Joi.string().optional().allow(''),
  bookedBy: Joi.string()
}).min(1);
// TODO: per README.md section 4, you will need a way to detect whether a
// proposed booking conflicts with an existing one on the same room.

// GET /api/bookings
// TODO: implement per README.md section 3.
export async function getAllBookings(req, res, next) {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).populate('bookedBy', 'name email');
    res.json({ bookings });
  } catch (err) { next(err); }
}

// GET /api/bookings/:id
// TODO: implement per README.md sections 3 and 5.
export async function getBooking(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id).populate('bookedBy', 'name email');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ booking });
  } catch (err) { next(err); }
}
// POST /api/bookings
// TODO: implement per README.md sections 3 and 4.
export async function createBooking(req, res, next) {
  try {
    const { value, error } = createSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    if (new Date(value.startDate) >= new Date(value.endDate)) {
      return res.status(400).json({ message: 'startDate must be before endDate' });
    }

    const conflict = await Booking.findOne({
      roomNumber: value.roomNumber,
      startDate: { $lt: new Date(value.endDate) },
      endDate: { $gt: new Date(value.startDate) }
    });

    if (conflict) {
      return res.status(409).json({ message: 'Booking conflicts with an existing booking in this room' });
    }

    const booking = await Booking.create(value);
    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/bookings/:id
// TODO: implement per README.md sections 3, 4, and 5.
export async function updateBooking(req, res, next) {
  try {
    const { value, error } = updateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const existing = await Booking.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const finalRoomNumber = value.roomNumber ?? existing.roomNumber;
    const finalStartDate = value.startDate ?? existing.startDate;
    const finalEndDate = value.endDate ?? existing.endDate;

    if (new Date(finalStartDate) >= new Date(finalEndDate)) {
      return res.status(400).json({ message: 'startDate must be before endDate' });
    }

    const conflict = await Booking.findOne({
      _id: { $ne: req.params.id },
      roomNumber: finalRoomNumber,
      startDate: { $lt: new Date(finalEndDate) },
      endDate: { $gt: new Date(finalStartDate) }
    });

    if (conflict) {
      return res.status(409).json({
        message: 'Booking conflicts with an existing booking in this room'
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: value },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/bookings/:id
// TODO: implement per README.md sections 3 and 5.
export async function deleteBooking(req, res, next) {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
}
