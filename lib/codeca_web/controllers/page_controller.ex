defmodule CodecaWeb.PageController do
  use CodecaWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end
end
