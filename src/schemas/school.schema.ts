import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SchoolDocument = School & Document;

@Schema({ timestamps: true })
export class School {
  @Prop({ type: Types.ObjectId, ref: 'Country', required: true })
  countryId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // 영어 이름

  @Prop({ required: true })
  nameKor: string; // 한글 이름

  @Prop({ required: true })
  minCompletedSemester: number;

  @Prop({ required: true })
  toefl: number;

  @Prop({ required: true })
  ielts: number;

  @Prop({
    type: String,
    enum: ['한 학기만 파견', '한 학기 파견 후 연장'],
    required: true,
  })
  availableSemester: '한 학기만 파견' | '한 학기 파견 후 연장';

  @Prop()
  qsRank?: number;

  @Prop({ required: true })
  hasDormitory: boolean;

  @Prop()
  city?: string;

  @Prop()
  personnel?: number;

  @Prop()
  homepageUrl?: string;

  @Prop()
  minGpa?: number;

  @Prop()
  language_remarks?: string;
}

export const SchoolSchema = SchemaFactory.createForClass(School);
