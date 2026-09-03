# Deploy do MoveSecurity — OKE/OCI (dev e prod)

Este documento descreve como conteinerizar e publicar o MoveSecurity no mesmo
cluster OKE (Oracle Kubernetes Engine) que já hospeda o moveplanner, seguindo
o mesmo padrão de operação (imagem única com nginx + backend via
`supervisord`, HTTPS com o certificado wildcard `*.movecta.com.br`, deploy
manual via scripts shell, registry `gru.ocir.io/grs61s2n1sbr/...`).

## Arquitetura

- Um único container por ambiente: nginx serve o build estático do frontend
  (React/Vite) e faz proxy para o backend Node/Express (`/api`, `/uploads`,
  `/ws`), como dois processos gerenciados pelo `supervisord`
  (`docker/supervisord.conf`).
- Banco de dados: MySQL (fora do cluster), via Prisma. `DATABASE_URL` é
  injetada por Kubernetes Secret, nunca embutida na imagem.
- TLS termina no nginx do próprio pod, com o certificado montado via
  Kubernetes Secret (mesmo arquivo usado pelo moveplanner).
- Cada ambiente (`movesecurity-dev`/`movesecurity-prod`) é um namespace
  dedicado no mesmo cluster OKE do moveplanner, exposto por um `Service`
  `type: LoadBalancer` com anotações da OCI (IP público fixo).

## Build e teste local

```bash
cd backend && docker compose -f docker-compose.mysql.yml up -d   # MySQL local
cd ..
docker build -t movesecurity:local .
docker run -p 8080:80 -p 8443:443 \
  -e DATABASE_URL="mysql://root:<senha>@host.docker.internal:3306/movesecurity" \
  -e JWT_SECRET="..." -e SUPER_ADMIN_PASSWORD="..." \
  -v <pasta-com-tls.crt-tls.key-ca.crt>:/etc/nginx/certs:ro \
  movesecurity:local
```

## Deploy

1. Criar os Secrets do ambiente (uma vez, ou quando os valores mudarem): ver
   `docker/create-secrets.example.sh` — copiar os comandos, preencher os
   valores reais manualmente no terminal (nunca versionar, nunca colar em
   IA).
2. Exportar `OCIR_USERNAME` e `OCIR_TOKEN` no shell (credencial de uma conta
   de serviço, não pessoal).
3. Rodar `./deploy-dev.sh` (primeiro deploy ou mudança nos manifests) ou
   `./publish-dev.sh` (atualização de imagem via rolling update). Mesma
   lógica para produção com os scripts `-prod`.

## Checklist de verificação

Itens já validados nesta sessão, localmente (Docker, sem tocar em cluster
real):

- [x] `docker build` da imagem completa (frontend + backend + runtime)
      concluído sem erros.
- [x] `prisma migrate deploy` aplica a migration-baseline do MySQL sem
      erro (schema, tipos `@db.Text`/`@db.VarChar` e tamanho de linha
      validados).
- [x] Teste de concorrência (8 transações simultâneas, 5 rodadas) na
      numeração sequencial que antes usava `pg_advisory_xact_lock` — sem
      duplicidade, sem deadlock.
- [x] Container sobe com `supervisord` gerenciando `nginx` e `backend`;
      `/api/health` responde 200 em HTTP (porta 80, sem redirect) e em
      HTTPS (porta 443).
- [x] Porta 80 redireciona (301) para HTTPS em qualquer outro caminho.
- [x] SPA React é servida corretamente em HTTPS (`/`).
- [x] Processo do backend roda como usuário não-root (`movesecurity`,
      UID/GID 10001); pasta `uploads/` é gravável por esse usuário.
- [x] `tsc --noEmit` (typecheck) limpo após todas as mudanças de código.
- [x] `kubectl apply --dry-run=client` valida a sintaxe dos manifests
      `movesecurity-dev.yml` e `movesecurity-prod.yml`.

Pendente — só é possível validar no ambiente real:

- [ ] Aplicar `movesecurity-dev.yml` no cluster real (`context-dev`) e
      confirmar que os pods sobem sem `CrashLoopBackOff`/restarts.
- [ ] Validar HTTPS com o certificado `*.movecta.com.br` real (não o
      autoassinado usado no teste local) e o `Service` recebendo o IP de
      Load Balancer.
- [ ] Confirmar que a numeração sequencial (certificados, códigos de
      análise de risco) funciona corretamente contra o MySQL real de
      homologação, com uso concorrente de verdade.
- [ ] Confirmar que `JWT_SECRET`/`SUPER_ADMIN_PASSWORD` reais (não os
      defaults inseguros do código) estão configurados via Secret.
- [ ] Só então repetir para `movesecurity-prod`.

## Pendências que dependem de decisão/acesso externo

- Host/porta/usuário/senha da instância MySQL já existente (confirmar se
  dev e prod usam a mesma instância com schemas separados, ou instâncias
  distintas) — **nunca enviar esses valores por chat/IA**, preencher
  direto no comando `kubectl create secret` a partir de
  `docker/create-secrets.example.sh`.
- Reserva de 2 novos IPs públicos de Load Balancer na OCI (dev/prod — os
  IPs do moveplanner não podem ser reaproveitados); preencher
  `loadBalancerIP` nos dois YAMLs depois de reservados.
- Registro DNS de `movesecurity.movecta.com.br` /
  `movesecurity-dev.movecta.com.br` apontando para esses IPs.
- Confirmar o nome real do `storageClass` disponível no cluster OKE para o
  PVC de uploads (deixado comentado nos YAMLs, usando o padrão do cluster
  por enquanto).
- Criar a credencial de conta de serviço (não pessoal) para pull de imagem
  do OCIR e para os scripts de deploy (`OCIR_USERNAME`/`OCIR_TOKEN`).
- Rotacionar as senhas do MySQL de homologação e produção que foram
  coladas nesta conversa antes de este plano ser executado em produção.
