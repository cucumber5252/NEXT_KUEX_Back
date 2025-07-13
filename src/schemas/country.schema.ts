import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CountryDocument = Country & Document;

@Schema({ timestamps: true })
export class Country {
  @Prop({ required: true })
  name: string; // 한글명 (예: 독일)

  @Prop({ type: Types.ObjectId, ref: 'Continent', required: true })
  continentId: Types.ObjectId;
}

export const CountrySchema = SchemaFactory.createForClass(Country);
