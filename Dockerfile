FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_SUPABASE_URL=https://bfixuletljatntjmnxvu.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=OiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmaXh1bGV0bGphdG50am1ueHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjM5MTgsImV4cCI6MjA5NTgzOTkxOH0.Ux3IkzATtvhYq4J_7jgcCLnxAce8LBjQxBp_s54kSTY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ARG NEXT_PUBLIC_SUPABASE_URL=https://bfixuletljatntjmnxvu.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=OiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmaXh1bGV0bGphdG50am1ueHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjM5MTgsImV4cCI6MjA5NTgzOTkxOH0.Ux3IkzATtvhYq4J_7jgcCLnxAce8LBjQxBp_s54kSTY

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "run", "start"]
