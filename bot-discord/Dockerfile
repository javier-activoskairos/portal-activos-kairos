# Puente Discord → Portal. Proceso largo (gateway 24/7), sin puertos expuestos.
FROM node:22-alpine

WORKDIR /app

# Capa de dependencias aparte: los cambios en index.mjs no reinstalan nada.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY index.mjs ./

# Sin root: el bot no necesita privilegios.
USER node

CMD ["node", "index.mjs"]
