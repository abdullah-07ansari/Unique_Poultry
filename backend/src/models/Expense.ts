import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  category: 'Feed' | 'Medicine' | 'Labor' | 'Other' | 'Electricity' | 'Equipment' | 'Vaccination' | 'Transport' | 'Miscellaneous';
  amount: number;
  date: Date;
  batchRef?: mongoose.Types.ObjectId;
}

const ExpenseSchema: Schema = new Schema({
  category: { 
    type: String, 
    enum: ['Feed', 'Medicine', 'Labor', 'Other', 'Electricity', 'Equipment', 'Vaccination', 'Transport', 'Miscellaneous'], 
    required: true 
  },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  batchRef: { type: Schema.Types.ObjectId, ref: 'Batch' }
});

export default mongoose.model<IExpense>('Expense', ExpenseSchema);
