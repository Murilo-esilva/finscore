-- FinScore / Supabase
-- Categorias padrão do sistema.
-- user_id NULL + is_system TRUE = visíveis para todos os usuários e não editáveis.

insert into public.categories (
  user_id,
  name,
  nature,
  parent_id,
  is_essential,
  is_system
)
select
  null,
  s.name,
  s.nature::public.category_nature,
  null,
  s.is_essential,
  true
from (
  values
    ('Alimentação', 'expense', true),
    ('Moradia', 'expense', true),
    ('Transporte', 'expense', true),
    ('Saúde', 'expense', true),
    ('Educação', 'expense', false),
    ('Serviços', 'expense', false),
    ('Assinaturas', 'expense', false),
    ('Lazer', 'expense', false),
    ('Compras', 'expense', false),
    ('Impostos e taxas', 'expense', true),
    ('Outros', 'expense', false),
    ('Salário', 'income', false),
    ('Freelance', 'income', false),
    ('Rendimentos', 'income', false),
    ('Reembolsos', 'income', false),
    ('Outras receitas', 'income', false)
) as s(name, nature, is_essential)
where not exists (
  select 1
    from public.categories c
   where c.user_id is null
     and c.is_system = true
     and c.name = s.name
     and c.nature = s.nature::public.category_nature
);

notify pgrst, 'reload schema';
