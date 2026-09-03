#!/bin/bash
# Template dos Secrets do movesecurity no Kubernetes.
#
# NÃO rode este arquivo direto: copie os comandos, troque os <placeholders>
# pelos valores reais e rode manualmente no terminal. Nunca commitar uma
# cópia deste arquivo com valores reais preenchidos, e nunca colar esses
# valores em nenhuma ferramenta de IA (inclusive nesta conversa).
#
# Uso: ./create-secrets.example.sh <namespace> <context-kubectl>
# Ex.:  ./create-secrets.example.sh movesecurity-dev context-dev
set -euo pipefail

NAMESPACE="${1:?informe o namespace: movesecurity-dev ou movesecurity-prod}"
CONTEXT="${2:?informe o context: context-dev ou context-producao}"

# 1) Segredos da aplicação (DATABASE_URL, JWT_SECRET, etc.)
#    Gere um JWT_SECRET forte e único por ambiente, ex.: openssl rand -base64 48
kubectl --context "$CONTEXT" create secret generic movesecurity-secrets \
  --namespace "$NAMESPACE" \
  --from-literal=DATABASE_URL='mysql://<usuario>:<senha>@<host>:3306/movesecurity' \
  --from-literal=JWT_SECRET='<segredo forte e unico deste ambiente>' \
  --from-literal=SUPER_ADMIN_PASSWORD='<senha forte, unica por ambiente>' \
  --from-literal=OPENAI_API_KEY='<chave da OpenAI, se o OCR estiver ativo>' \
  --from-literal=SMTP_HOST='<host smtp, se usado>' \
  --from-literal=SMTP_PORT='<porta smtp>' \
  --from-literal=SMTP_USER='<usuario smtp>' \
  --from-literal=SMTP_PASS='<senha smtp>' \
  --from-literal=SMTP_FROM='<remetente padrao>'

# 2) Certificado wildcard *.movecta.com.br (mesmo usado pelo moveplanner,
#    arquivos em /home/marcelo/moveplanner/docker/nginx/certs/). Secret
#    genérico com 3 chaves porque o nginx.conf espera tls.crt + tls.key +
#    ca.crt como arquivos separados (não dá pra usar "kubectl create secret
#    tls", que só gera tls.crt/tls.key).
kubectl --context "$CONTEXT" create secret generic ca-certificate-secret-movesecurity \
  --namespace "$NAMESPACE" \
  --from-file=tls.crt=/home/marcelo/moveplanner/docker/nginx/certs/tls.crt \
  --from-file=tls.key=/home/marcelo/moveplanner/docker/nginx/certs/tls.key \
  --from-file=ca.crt=/home/marcelo/moveplanner/docker/nginx/certs/ca.crt

# 3) Credencial de pull de imagem do OCIR (conta de serviço, não pessoal -
#    diferente do moveplanner, que usa o secret pessoal "marcelo.tavares").
kubectl --context "$CONTEXT" create secret docker-registry ocir-pull-movesecurity \
  --namespace "$NAMESPACE" \
  --docker-server=gru.ocir.io \
  --docker-username='<tenancy-namespace>/oracleidentitycloudservice/<usuario-de-servico>@<dominio>' \
  --docker-password='<auth token gerado no perfil OCI da conta de servico>' \
  --docker-email='<email-da-conta-de-servico>'
