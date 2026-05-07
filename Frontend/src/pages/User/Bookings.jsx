import { useEffect, useState } from "react";
import { useUser } from "../../contexts/userContext";
import Header from "../../components/Layout/Header";
import "./Bookings.css";
import { socket } from "../../components/Booking/SeatMatrix";
import { useNavigate } from "react-router-dom";
import Loader from "../../components/Loader/Loader";
import ErrorMessage from "../../components/Error/ErrorMessage";
function formatShowDate(unix) {
  const d = new Date(unix * 1000);
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
  return `${day}, ${monthDay}`;
}
function formatTime(unix) {
  const date = new Date(unix * 1000);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${hours}.${minutes} ${ampm}`;
}

export default function Bookings() {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [bookings, setBookings] = useState([]);
  const [cancel, setCancel] = useState(false);
  const [cancelBooking, setCancelBooking] = useState({});
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loader, setLoader] = useState(true);
  const [error, setError] = useState();

  useEffect(() => {
    socket.on("bookingSeatsCancelled", (newBookings) => {
      setBookings(newBookings);
      setCancel(false);
      setSelectedSeats([]);
      setCancelBooking({});
    });
    socket.on("error", (err) => {
      setError(err.message);
    });
    return () => {
      socket.off("bookingSeatsCancelled");
      socket.off("error");
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const func = async () => {
      try{
      const data = await fetch(
        ` ${import.meta.env.VITE_SERVER_URL}/api/bookings/${user._id}`
        , { credentials: "include" }
      );
      const bookingData = await data.json();
      if (!data.ok) {
        throw new Error(bookingData.message || "Failed to fetch bookings");
      }
      setBookings(bookingData);
      setLoader(false);
    }
      catch(error) {
        setError(error.message);
        setLoader(false);
      }
    };
    func();
  }, [user]);

  const handleCancel = (e) => {
    setCancel(!cancel);
    setCancelBooking(bookings[e.target.id]);
  };

  if(error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <>
      <div className={`booking-div ${cancel ? "bgBlur" : ""}`}>
        <Header></Header>
        {loader ? (
          <Loader />
        ) : (
          <>
            <div className="upcoming-big-container">
              <h3 style={{ marginLeft: "3rem", fontSize: "2rem" }}>Upcoming</h3>
              <div className="booking-container-upcoming">
                {bookings.map(
                  (booking, index) =>
                    booking.show.startTime - Math.floor(Date.now() / 1000) >
                      0 && (
                      <div className="booking-item">
                        <p>Movie : {booking.show.movie.title}</p>
                        <p>Theatre : {booking.show.theatre.name}</p>
                        <p>Location : {booking.show.theatre.location}</p>
                        <p>
                          Start Time : {formatShowDate(booking.show.startTime)}{" "}
                          , {formatTime(booking.show.startTime)}
                        </p>
                        <p>Seats : </p>
                        <div className="booking-seat-container">
                          {booking.seats.map((seat) => (
                            <div className="booking-seat">{seat}</div>
                          ))}
                        </div>
                        {booking.show.startTime -
                          Math.floor(Date.now() / 1000) >
                          3600 && (
                          <button
                            className="cancel-button"
                            id={`${index}`}
                            onClick={handleCancel}
                          >
                            Cancel Seat
                          </button>
                        )}
                        <p>
                          Booking Time : {formatShowDate(booking.time)} ,{" "}
                          {formatTime(booking.time)}
                        </p>
                      </div>
                    )
                )}
              </div>
            </div>
            <div className="ended-big-container">
              <h3 style={{ marginLeft: "3rem", fontSize: "2rem" }}>Ended</h3>
              <div className="booking-container-ended">
                {bookings.map(
                  (booking, index) =>
                    booking.show.startTime - Math.floor(Date.now() / 1000) <
                      0 && (
                      <div className="booking-item">
                        <p>Movie : {booking.show.movie.title}</p>
                        <p>Theatre : {booking.show.theatre.name}</p>
                        <p>Location : {booking.show.theatre.location}</p>
                        <p>
                          Start Time : {formatShowDate(booking.show.startTime)}{" "}
                          , {formatTime(booking.show.startTime)}
                        </p>
                        <p>Seats : </p>
                        <div className="booking-seat-container">
                          {booking.seats.map((seat) => (
                            <div className="booking-seat">{seat}</div>
                          ))}
                        </div>
                        {booking.show.startTime -
                          Math.floor(Date.now() / 1000) >
                          3600 && (
                          <button
                            className="cancel-button"
                            id={`${index}`}
                            onClick={handleCancel}
                          >
                            Cancel Seat
                          </button>
                        )}
                        <p>
                          Booking Time : {formatShowDate(booking.time)} ,{" "}
                          {formatTime(booking.time)}
                        </p>
                      </div>
                    )
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {cancel && (
        <div className="cancel-seat-outer-div">
          <div className="cancel-seat-div">
            <p>Select seats to be cancelled : </p>
            <div className="booking-seat-container">
              {cancelBooking.seats.map((seat) =>
                !selectedSeats.includes(seat) ? (
                  <div
                    className="booking-seat"
                    onClick={() => {
                      setSelectedSeats([...selectedSeats, seat]);
                    }}
                  >
                    {seat}
                  </div>
                ) : (
                  <div
                    className="booking-seat-selected"
                    onClick={() => {
                      setSelectedSeats(
                        selectedSeats.filter((seats) => seats !== seat)
                      );
                    }}
                  >
                    {seat}
                  </div>
                )
              )}
            </div>
            <button
              className="cancel-button"
              onClick={() => {
                socket.emit("cancelSeats", {
                  seats: selectedSeats,
                  booking: cancelBooking,
                });
              }}
            >
              Cancel Seat
            </button>
          </div>
          <div
            className="close-button"
            onClick={() => {
              setCancel(false);
              setCancelBooking({});
            }}
          >
            X
          </div>
        </div>
      )}
    </>
  );
}
