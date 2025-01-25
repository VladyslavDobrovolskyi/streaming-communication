# Используем официальный образ Node.js
FROM node:18

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json в контейнер
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь код в контейнер
COPY . .

# Открываем порты, на которых приложение будет работать
EXPOSE 9999

# Запускаем оба процесса, один в фоне
CMD sh -c "npm run start" 
