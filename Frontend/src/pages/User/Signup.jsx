import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
// const navigate = useNavigate();
import "./Signup.css";

function Signup() {
  const location = useLocation();
  const navigate = useNavigate();
  let [formState, setFormState] = new useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  let [error, setError] = new useState("");
  let [isEmpty, setIsEmpty] = new useState({
    name: false,
    username: false,
    email: false,
    password: false,
  });
  function handleFormState(event) {
    setFormState((currState) => {
      currState[event.target.id] = event.target.value;
      return { ...currState };
    });
    setError("");
    setIsEmpty({ name: false, username: false, email: false, password: false });
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    if (
      formState.name === "" ||
      formState.username === "" ||
      formState.email === "" ||
      formState.password === ""
    ) {
      return setIsEmpty({
        name: formState.name === "",
        username: formState.username === "",
        email: formState.email === "",
        password: formState.password === "",
      });
    }
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: await JSON.stringify({
        name: formState.name,
        username: formState.username,
        email: formState.email,
        password: formState.password,
      }),
    });

    // setFormState({name : "" , username : "" , email : "" , password : ""});
    const data = await res.json();
    if (!res.ok) {
      setError(data.message);
    } else {
      navigate("/verify", {
        state: { email: formState.email, from: location.state?.from },
      });
    }
  }
  return (
    <div className="container">
      <div className="form-container">
        <h1 className="heading">
          Movie<span>Book</span>
        </h1>
        <form>
          <div className="input-div">
            <input
              type="text"
              id="name"
              className="form-input"
              placeholder="Name"
              value={formState.name}
              onChange={handleFormState}
            ></input>
            {isEmpty.name && <p className="error">name is required</p>}
          </div>
          <div className="input-div">
            <input
              type="text"
              id="username"
              className="form-input"
              placeholder="Username"
              value={formState.username}
              onChange={handleFormState}
            ></input>
            {isEmpty.username && <p className="error">username is required</p>}
          </div>
          <div className="input-div">
            <input
              type="email"
              id="email"
              placeholder="Email"
              className="form-input"
              value={formState.email}
              onChange={handleFormState}
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
            ></input>
            {isEmpty.password && <p className="error">password is required</p>}
          </div>
          {!(error === "") && <p className="error">! {error}</p>}
          <button onClick={handleFormSubmit} className="form-button">
            SIGN UP
          </button>
        </form>
        <p>
          Already have an account? <Link to="/login">login!</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
