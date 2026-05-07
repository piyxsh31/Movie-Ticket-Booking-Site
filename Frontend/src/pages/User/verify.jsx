import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../contexts/userContext";
import "./Signup.css";

function Verify() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const from = location.state?.from?.pathname || "/";
  let [formState, setFormState] = new useState({ verificationCode: "" });
  let [error, setError] = new useState("");
  let [isEmpty, setIsEmpty] = new useState({ verificationCode: false });
  function handleFormState(event) {
    setFormState((currState) => {
      currState[event.target.id] = event.target.value;
      return { ...currState };
    });

    setError("");
    setIsEmpty({ verificationCode: false });
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    if (formState.verificationCode === "") {
      return setIsEmpty({ verificationCode: true });
    }
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: await JSON.stringify({
        email: location.state.email,
        verificationCode: formState.verificationCode,
      }),
    });

    setFormState({ verificationCode: "" });
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
          Movie<span>Book</span>
        </h1>
        <form>
          <div className="input-div">
            <input
              type="number"
              id="verificationCode"
              className="form-input"
              placeholder="Verification Code"
              value={formState.verificationCode}
              onChange={handleFormState}
              required
            ></input>
            {isEmpty.verificationCode && (
              <p className="error">Verification Code is required</p>
            )}
          </div>
          {!(error === "") && <p className="error">! {error}</p>}
          <button onClick={handleFormSubmit} className="form-button">
            VERIFY
          </button>
          <br></br>
        </form>
      </div>
    </div>
  );
}

export default Verify;
