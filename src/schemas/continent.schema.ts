import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContinentDocument = Continent & Document;

@Schema({ timestamps: true })
export class Continent {
  @Prop({ required: true })
  name: string; // 한글명 (예: 유럽)
}

export const ContinentSchema = SchemaFactory.createForClass(Continent);
