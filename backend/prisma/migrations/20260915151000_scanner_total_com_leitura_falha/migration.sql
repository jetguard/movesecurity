UPDATE "ScannerPassagem"
SET "total" =
  "leituraComFalha" +
  "leituraSatisfatoria" +
  "insatisfatoria" +
  "falhasEquipamento";
