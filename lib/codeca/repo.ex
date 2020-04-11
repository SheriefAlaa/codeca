defmodule Codeca.Repo do
  use Ecto.Repo,
    otp_app: :codeca,
    adapter: Ecto.Adapters.Postgres
end
