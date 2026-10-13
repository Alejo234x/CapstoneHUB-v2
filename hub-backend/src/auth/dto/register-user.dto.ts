import { NewUserDto } from './new-user.dto';

/** Registro público: mismo esquema que `NewUserDto`, sin roles adicionales. */
export class RegisterUserDto extends NewUserDto {}
