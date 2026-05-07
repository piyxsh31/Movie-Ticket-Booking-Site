import { useState } from "react";
import { FaStar } from "react-icons/fa";
import styles from "./ReviewsAndRatingsSection.module.css";
import { useUser } from "../../contexts/userContext";
import { useLocation , useNavigate} from "react-router-dom";

export default function ReviewsAndRatingsSection({ info , reviews , setReviews}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(null);

  const handleSubmit = async () => {
    if(!user) {
      return navigate("/login", { state: { from: location }, replace: true });
    }
    if (newComment.trim() !== "") {
      try{
        const newEntry = {
          comment: newComment,
          rating: rating || 0,
          user : user._id,
          movie : info._id,
        };
        const newReviewData = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/reviews`, {
          method: "POST",
          credentials:"include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newEntry),
        });
        if (!newReviewData.ok) {
          const errorData = await newReviewData.json();
          throw new Error(errorData.message || "Failed to submit review");
        }
        const newReview = await newReviewData.json();
        setReviews((prevReviews) => [...prevReviews, newReview]);
        setNewComment("");
        setRating(0);
      }
      catch (error) {
        alert("Failed to submit review. Please try again.");
      }
    }
  };

  return (
    <div className={styles.container}>
      <h2>Reviews & Ratings</h2>
      <div>Average Rating: </div>
      <div>{info.ratings.imdbRating}</div>

      <div className={styles.inputSection}>
        <textarea
          placeholder="Write your comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className={styles.textarea}
        />

        <div className={styles.stars}>
          {[...Array(5)].map((_, index) => {
            const starValue = index + 1;
            return (
              <FaStar
                key={starValue}
                size={24}
                className={styles.star}
                color={
                  starValue <= (hover || rating) ? "#f9ab00" : "#444"
                }
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHover(starValue)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </div>

        <button onClick={handleSubmit} className={styles.submitButton}>
          Submit
        </button>
      </div>

      <div className={styles.commentSection}>
        <h3>User Comments</h3>
        {reviews.length === 0 && <p className={styles.noComments}>No comments yet.</p>}
        {reviews.map((review, idx) => (
          <div key={idx} className={styles.commentCard}>
            <p className={styles.name}>{review.user.name}</p>
            <p className={styles.username}>@{review.user.username}</p>
            <div className={styles.commentStars}>
              {[...Array(review.rating)].map((_, i) => (
                <FaStar key={i} size={16} color="#f9ab00" />
              ))}
            </div>
            <p className={styles.commentText}>{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
