import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../contexts/userContext";
import "./Signup.css";

function Login() {
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";
  const navigate = useNavigate();
  let { setUser } = useUser();
  let [formState, setFormState] = new useState({ email: "", password: "" });
  let [error, setError] = new useState("");
  let [isEmpty, setIsEmpty] = new useState({ email: false, password: false });
  function handleFormState(event) {
    setFormState((currState) => {
      currState[event.target.id] = event.target.value;
      return { ...currState };
    });

    setError("");
    setIsEmpty({ email: false, password: false });
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    if (formState.email === "" || formState.password === "") {
      return setIsEmpty({
        email: formState.email === "",
        password: formState.password === "",
      });
    }
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: await JSON.stringify({
        username: "",
        email: formState.email,
        password: formState.password,
      }),
    });

    setFormState({ email: "", password: "" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message);
    } else {
      setUser(data.user);
      navigate(from, { replace: true });
    }
  }
  return (
    <div className="container">
      <div className="form-container">
        <h1 className="heading">
          GetMy<span>Seat</span>
        </h1>
        <form>
          <div className="input-div">
            <input
              type="email"
              id="email"
              placeholder="Email"
              className="form-input"
              value={formState.email}
              onChange={handleFormState}
              required
            ></input>
            {isEmpty.email && <p className="error">email is required</p>}
          </div>
          <div className="input-div">
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="Password"
              value={formState.password}
              onChange={handleFormState}
              required
            ></input>
            {isEmpty.password && <p className="error">password is required</p>}
          </div>
          {!(error === "") && <p className="error">! {error}</p>}
          <button onClick={handleFormSubmit} className="form-button">
            LOGIN
          </button>
        </form>
        <p>
          Do not have an account?{" "}
          <Link to="/signup" state={{ from: location.state?.from }}>
            Signup!
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
