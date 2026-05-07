import React, { useEffect } from "react";

const createOrder = async (amount) => {
  const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // if needed
    body: JSON.stringify({ amount }), // amount in rupees
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data.order;
};

const RazorpayButton = ({ amount, onSuccess, selectedSeats }) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
  if (!window.Razorpay) {
    alert("Razorpay SDK is still loading. Please try again.");
    return;
  }

  try {
    const order = await createOrder(amount); 

    const options = {
      key: "rzp_test_eZTXX0YnP9TdKT", 
      amount: order.amount, 
      currency: "INR",
      name: "GetMySeat",
      description: `Booking for ${selectedSeats.length} seats`,
      order_id: order.id, 
      handler: function (response) {
        if (onSuccess) {
          onSuccess({
            ...response,
            amount: order.amount,
          });
        }
      },
      prefill: {
        name: "Customer Name",
        email: "customer@example.com",
      },
      notes: {
        seats: selectedSeats.join(", "),
      },
      theme: {
        color: "#528FF0",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response) {
      alert("Payment failed: " + response.error.description);
    });
    rzp.open();
  } catch (error) {
    console.error("Payment init failed:", error);
    alert("Could not initialize Razorpay checkout.");
  }
};

  return (
    <button
      onClick={handlePayment}
      style={{
        backgroundColor: "#f9ab00",
        color: "white",
        padding: "10px 20px",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "16px",
        fontWeight: "bold",
        width: "100%",
        marginTop: "10px",
        transition: "box-shadow 0.3s ease",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.boxShadow = "0 4px 10px rgba(249, 171, 0, 0.6)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
      disabled={!selectedSeats || selectedSeats.length === 0}
    >
      Pay ₹{amount}
    </button>
  );
};

export default RazorpayButton;
