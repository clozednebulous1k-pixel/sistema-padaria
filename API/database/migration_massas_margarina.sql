-- Tipos de massa adicionais (com margarina) para cadastro e filtros
INSERT INTO massas_padaria (nome, ordem)
SELECT t.nome, t.ordem
FROM (VALUES
    ('Massa Doce com margarina', 5),
    ('Massa Salgada com margarina', 6)
) AS t(nome, ordem)
WHERE NOT EXISTS (
    SELECT 1 FROM massas_padaria m WHERE m.nome = t.nome
);
