import { ApiProperty } from '@nestjs/swagger';

export class NavigationFlagsResponseDto {
  @ApiProperty({
    description:
      'Whether each navigation section (keyed by the frontend navigation item id) is enabled. ' +
      'A missing key or `false` means the section is still locked/"em breve".',
    type: 'object',
    additionalProperties: { type: 'boolean' },
    example: { respiracao: true, missoes: false, perfil: true },
  })
  flags!: Record<string, boolean>;
}
