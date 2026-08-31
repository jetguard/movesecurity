from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Table,
    TableStyle,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"
OUTPUT.mkdir(parents=True, exist_ok=True)
PDF_PATH = OUTPUT / "MoveSecurity_Requisitos_Especificacoes_Implantacao.pdf"

FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

arial = Path("C:/Windows/Fonts/arial.ttf")
arial_bold = Path("C:/Windows/Fonts/arialbd.ttf")
if arial.exists() and arial_bold.exists():
    pdfmetrics.registerFont(TTFont("Arial", str(arial)))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(arial_bold)))
    FONT_REGULAR = "Arial"
    FONT_BOLD = "Arial-Bold"


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT_REGULAR, 8)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(2 * cm, 1.15 * cm, "MoveSecurity - Requisitos e especificações para implantação")
    canvas.drawRightString(A4[0] - 2 * cm, 1.15 * cm, f"Página {doc.page}")
    canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="TitleMov",
        parent=styles["Title"],
        fontName=FONT_BOLD,
        fontSize=21,
        leading=25,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="SubtitleMov",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=9.6,
        leading=12.5,
        textColor=colors.HexColor("#475569"),
        spaceAfter=16,
    )
)
styles.add(
    ParagraphStyle(
        name="SectionMov",
        parent=styles["Heading2"],
        fontName=FONT_BOLD,
        fontSize=11.4,
        leading=13.4,
        textColor=colors.HexColor("#1D4ED8"),
        spaceBefore=5,
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyMov",
        parent=styles["BodyText"],
        fontName=FONT_REGULAR,
        fontSize=8.1,
        leading=10.1,
        textColor=colors.HexColor("#172033"),
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        name="BulletMov",
        parent=styles["BodyText"],
        fontName=FONT_REGULAR,
        fontSize=7.9,
        leading=9.8,
        leftIndent=10,
        firstLineIndent=-8,
        textColor=colors.HexColor("#172033"),
        spaceAfter=1.5,
    )
)


def p(text, style="BodyMov"):
    return Paragraph(text, styles[style])


def section(title):
    return p(title, "SectionMov")


def bullets(items):
    return [p(f"• {item}", "BulletMov") for item in items]


def table(data, widths):
    tbl = Table(data, colWidths=widths, hAlign="LEFT", repeatRows=1)
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1D4ED8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                ("FONTSIZE", (0, 0), (-1, -1), 7.3),
                ("FONTNAME", (0, 1), (-1, -1), FONT_REGULAR),
                ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#172033")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
                ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return tbl


story = []
story.append(p("MoveSecurity", "TitleMov"))
story.append(p("Requisitos e especificações técnicas resumidas para implantação nacional", "SubtitleMov"))
story.append(
    p(
        "Este documento resume as recomendações técnicas para implantação do MoveSecurity em ambiente corporativo da Movecta, considerando operação nacional, múltiplas unidades, rastreabilidade, segurança, disponibilidade e crescimento do uso da plataforma."
    )
)

story.append(section("Dados Sugeridos da Aplicação"))
dados_app = [
    ["Item", "Definição"],
    ["Nome da aplicação", "MoveSecurity"],
    ["Link sugerido", "movesecurity.movecta.com.br"],
    ["SMTP", "Necessário para envio automático de certificados, convites de treinamento e notificações do sistema."],
    ["E-mail sugerido", "noreply.movesecurity@movecta.com.br"],
]
story.append(table([[p(c, "BodyMov") for c in row] for row in dados_app], [4.6 * cm, 11.6 * cm]))

story.append(section("1. Visão Geral"))
story.extend(
    bullets(
        [
            "O MoveSecurity é uma plataforma web para gestão de segurança patrimonial, operação, treinamentos, certificados, ocorrências, documentos, análises de risco e planos de ação.",
            "O sistema deve operar em ambiente centralizado, com acesso via navegador, domínio corporativo e comunicação segura por HTTPS.",
            "A implantação nacional deve considerar usuários de diferentes unidades, permissões por perfil, histórico auditável e banco único com segregação por unidade quando aplicável.",
        ]
    )
)

story.append(section("2. Módulos Contemplados"))
story.extend(
    bullets(
        [
            "Controle de usuários, grupos de treinamento e perfis de acesso com permissões por módulo e ação.",
            "Treinamentos públicos e restritos, incluindo POCs, integração de motoristas, emissão e validação de certificados.",
            "Ocorrências, eventos, investigações, relatórios, relatos de campo e central de documentos.",
            "Análise de riscos, cadastro geral de riscos, controles, dashboard, mapa de calor e plano de ação.",
            "Operação, câmeras CFTV, ordens de serviço, quadra de segurança, evidências, logs e auditoria.",
        ]
    )
)

story.append(section("3. Infraestrutura Recomendada"))
infra = [
    ["Item", "Recomendação"],
    ["Sistema operacional", "Ubuntu Server 24.04 LTS. Alternativa aceitável: Ubuntu Server 22.04 LTS."],
    ["Processamento", "Mínimo: 2 vCPU. Recomendado para produção nacional: 4 vCPU ou superior."],
    ["Memória", "Mínimo: 4 GB RAM. Recomendado: 8 GB RAM ou superior."],
    ["Armazenamento", "Mínimo: 80 GB SSD. Recomendado: 160 GB ou mais, considerando anexos, vídeos e certificados."],
    ["Banco de dados", "PostgreSQL 15 ou superior, com backup automatizado e retenção definida pela empresa."],
    ["Servidor web", "Nginx com HTTPS, proxy reverso para backend e publicação do frontend."],
    ["Runtime", "Node.js LTS compatível com o projeto, PM2 ou serviço equivalente para manter o backend em execução."],
    ["Acesso técnico", "Acesso SSH controlado para atualização do sistema, aplicação de migrations, manutenção e suporte técnico."],
]
story.append(table([[p(c, "BodyMov") for c in row] for row in infra], [5.1 * cm, 11.1 * cm]))

story.append(section("4. Banco de Dados e Migração"))
story.extend(
    bullets(
        [
            "A migração dos dados reais deve ser feita por dump e restore do PostgreSQL, usando pg_dump e pg_restore.",
            "As migrations do Prisma devem ser aplicadas após a restauração para garantir compatibilidade do schema com a versão implantada.",
            "A base deve preservar usuários, treinamentos, certificados, análises de risco, planos de ação, logs e demais registros operacionais.",
            "Certificados emitidos, uploads, evidências e anexos físicos devem ser migrados separadamente por cópia segura, como rsync ou scp.",
        ]
    )
)

story.append(section("5. Segurança e Acesso"))
story.extend(
    bullets(
        [
            "Implantação obrigatória com HTTPS e certificado válido para o domínio corporativo.",
            "Uso de variáveis de ambiente para credenciais, chaves, SMTP, banco e integrações. Arquivos .env reais não devem ser versionados.",
            "Recomendado integrar SSO corporativo futuramente, com login seguro pela conta da empresa e política de acesso centralizada.",
            "Perfis de acesso devem ser configuráveis por módulo e por ação: leitura, criação, edição e exclusão.",
            "Logs de auditoria devem registrar ações críticas, alterações de dados, acessos administrativos e movimentações sensíveis.",
        ]
    )
)

story.append(section("6. Versionamento e Entrega do Código"))
story.extend(
    bullets(
        [
            "O código-fonte do sistema deve ser versionado em repositório GitHub corporativo da Movecta.",
            "Devem ser versionados somente código, migrations, templates, imagens fixas, modelos de certificado, QR Codes fixos e documentação técnica.",
            "Não devem ser enviados ao GitHub: banco de dados, dumps, .env real, uploads, certificados emitidos, assinaturas, logs sensíveis ou backups.",
            "Recomenda-se fluxo com branch principal protegida, revisão de alterações e histórico de versões para rastreabilidade.",
        ]
    )
)

story.append(section("7. Backups e Continuidade"))
story.extend(
    bullets(
        [
            "Backup diário do PostgreSQL, com retenção mínima definida pela política interna da Movecta.",
            "Backup dos arquivos físicos do sistema: uploads, certificados, anexos, evidências e vídeos operacionais.",
            "Teste periódico de restauração para confirmar que banco e arquivos podem ser recuperados.",
            "Monitoramento de uso de disco, memória, CPU, logs de erro, disponibilidade do domínio e saúde do backend.",
        ]
    )
)

story.append(section("8. Domínio e Publicação"))
story.extend(
    bullets(
        [
            "O sistema deve ser publicado em domínio corporativo, com link sugerido movesecurity.movecta.com.br.",
            "O Nginx deve servir o frontend e encaminhar as rotas /api, /uploads e /ws para o backend.",
            "O backend deve operar em porta interna definida pela infraestrutura, preferencialmente sem exposição direta à internet.",
        ]
    )
)

story.append(section("9. Requisitos Para Implantação"))
req = [
    ["Área", "Necessidade"],
    ["TI Movecta", "Servidor Linux, domínio, acesso SSH controlado, PostgreSQL, Nginx, política de backup e permissões de deploy."],
    ["Aplicação", "Código no GitHub corporativo, arquivo .env configurado no servidor, migrations aplicadas e frontend publicado."],
    ["Dados", "Banco restaurado, uploads copiados, certificados preservados e validação dos tokens antigos."],
    ["Operação", "Testes de login, usuários, treinamentos, certificados, análises de risco, planos de ação e envio de e-mail."],
]
story.append(table([[p(c, "BodyMov") for c in row] for row in req], [4.2 * cm, 12 * cm]))

story.append(section("10. Validação Final"))
story.extend(
    bullets(
        [
            "Confirmar acesso de administradores e usuários comuns.",
            "Testar emissão e validação de certificado.",
            "Testar envio de e-mail SMTP.",
            "Testar upload e abertura de anexos.",
            "Validar treinamentos, relatórios, ocorrências, análises de risco e planos de ação.",
            "Registrar aceite técnico após validação em ambiente de homologação.",
        ]
    )
)

doc = SimpleDocTemplate(
    str(PDF_PATH),
    pagesize=A4,
    rightMargin=2 * cm,
    leftMargin=2 * cm,
    topMargin=1.35 * cm,
    bottomMargin=1.35 * cm,
    title="MoveSecurity - Requisitos e especificações técnicas",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(PDF_PATH)
