# Instrucciones para Codex — BARBERÍA ORIGINAL WAVE

Lee este archivo y los documentos relevantes de `docs/` **antes de modificar código**.

## Fuente de verdad y prioridades
1. Código real del repositorio (inspeccionarlo, no asumir que coincide con estos documentos).
2. Diseños existentes en Figma y capturas verificadas por el responsable del proyecto.
3. Reglas confirmadas en `docs/04-booking-reglas.md`.
4. Decisiones técnicas documentadas; las propuestas pendientes NO son requisitos aprobados.

Archivo Figma: https://www.figma.com/design/wNIPp8fmvemrC1jZRhZGYH/BARBER%C3%8DA-ORIGINAL-WAVE-%E2%80%94-Landing-Page

## Reglas de trabajo obligatorias
- Trabajar **por módulos y tareas pequeñas**. Antes de editar: inspeccionar archivos, explicar el plan y enumerar rutas afectadas.
- No reestructurar, borrar ni sobrescribir código existente sin necesidad demostrada y aprobación del usuario.
- No modificar Figma: el MCP está limitado. Usar Figma como referencia manual; solicitar capturas/medidas cuando falten.
- No inventar precios, horarios comerciales, dirección, teléfono, logo, fotografías oficiales, testimonios ni zonas de cobertura.
- No atribuir imágenes de referencia a trabajos reales de la barbería. Mantener placeholders claramente identificados hasta recibir recursos oficiales.
- Mantener responsive 1440px desktop / 390px mobile como referencias, con comportamiento fluido entre tamaños.
- Respetar tokens, tipografías y variantes existentes. No instalar librerías sin justificarlo.
- Preferir componentes semánticos, accesibles y reutilizables. Usar `next/link` para navegación interna y `next/image` cuando corresponda.
- No construir funcionalidades simuladas que aparenten reservar o cobrar realmente. Señalizar estados de demo o deshabilitar acciones hasta que existan rutas/backend.
- Validar con `npm run lint`, `npx tsc --noEmit` y compilación cuando sea viable; reportar comandos y resultados reales, sin afirmar pruebas no ejecutadas.
- No introducir secretos en el repositorio; `.env*` con credenciales nunca en Git.
- Cada entrega: archivos modificados, explicación, pruebas y pendientes.

## Estado al documentar
- Proyecto creado en `C:\AR_proyectos_personales\barbershop`, Next.js 16.4.3, App Router, TypeScript, Tailwind CSS 4, npm.
- `src/app/globals.css`: tokens base; `layout.tsx`: Barlow Condensed y DM Sans; `page.tsx`: pantalla temporal de componentes.
- `src/components/ui/Button.tsx`, `Container.tsx`, `SectionHeading.tsx` creados según conversación; **verificar existencia y contenido**.
- El servidor local ya mostró componentes. El resultado de `npm run lint` aún no se ha confirmado.
- Una captura muestra un botón suelto «Cerrar» que no procede del código proporcionado: investigar antes de ocultarlo.

## Orden de ejecución
Seguir `docs/06-plan-implementacion.md`. La primera tarea es auditar la base existente y preparar el Header/Navbar fiel a Figma, **no** implementar Booking o administración todavía.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
