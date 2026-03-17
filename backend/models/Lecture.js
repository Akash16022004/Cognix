import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema({
  youtubeLink: {
    type: String,
    required: true,
    trim: true,
  },
  notes: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Lecture = mongoose.model('Lecture', lectureSchema);

export default Lecture;

