import mongoose from 'mongoose';
import { env } from '~/env'

mongoose.connect(env.MONGO_URL)