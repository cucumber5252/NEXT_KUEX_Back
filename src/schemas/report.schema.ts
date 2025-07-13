import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  schoolId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  exchangeYear: number;

  @Prop({ type: String, enum: ['1학기', '2학기'], required: true })
  exchangeSemester: '1학기' | '2학기';

  @Prop({
    type: {
      applicationProcess: { type: String },
      visaProcess: { type: String },
      schoolEnvironment: { type: String },
      classes: { type: String },
      accommodationMeals: { type: String },
      facilitiesPrograms: { type: String },
      internationalOffice: { type: String },
      livingTips: { type: String },
    },
    default: {},
  })
  content: {
    applicationProcess?: string;
    visaProcess?: string;
    schoolEnvironment?: string;
    classes?: string;
    accommodationMeals?: string;
    facilitiesPrograms?: string;
    internationalOffice?: string;
    livingTips?: string;
  };

  @Prop({ type: [String], default: [] })
  hashtags: string[];

  @Prop({ type: Number, default: 0 })
  viewCount: number;

  @Prop({ type: Number, default: 0 })
  likeCount: number;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  likedUsers: Types.ObjectId[];
}

export const ReportSchema = SchemaFactory.createForClass(Report);
