#!/bin/bash

# Скрипт для базовой настройки безопасности VPS (Ubuntu)

# Проверка на права root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Этот скрипт необходимо запускать под root (через sudo)"
   exit 1
fi

echo "--- 🕒 1. Обновление списка пакетов ---"
apt update

echo "--- 🛡️ 2. Настройка Firewall (UFW) ---"
# Установка ufw если его нет
apt install -y ufw

# Сброс настроек
ufw --force reset

# Разрешаем необходимые порты
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP (редирект)
ufw allow 443/tcp    # HTTPS
ufw allow 8080/tcp   # Admin fallback
ufw allow 5432/tcp   # DB (опционально, если нужно извне, но лучше оставить закрытым)

# Включаем логирование
ufw logging on

# Включаем фаервол
echo "y" | ufw enable

echo "--- 🚫 3. Установка и настройка Fail2Ban ---"
apt install -y fail2ban

# Копируем конфиг по умолчанию для правок
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Создаем базовую конфигурацию для SSH
cat <<EOF > /etc/fail2ban/jail.d/sshd.local
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 10m
findtime = 10m
EOF

systemctl restart fail2ban

echo "--- 🔄 4. Настройка автоматических обновлений безопасности ---"
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

echo "--- ✅ Базовая защита настроена! ---"
echo "Статус Firewall:"
ufw status
echo ""
echo "Статус Fail2Ban:"
fail2ban-client status sshd
