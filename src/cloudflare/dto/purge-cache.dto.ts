import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";


export class PurgeCacheDto {
    @IsOptional()
    @IsBoolean()
    purgeEverything?: boolean

    @IsOptional()
    @IsArray()
    hosts?: string[]
}