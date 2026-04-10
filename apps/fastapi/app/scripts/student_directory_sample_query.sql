-- Sample SQL for filtering, search, pagination, and join for Student Directory
SELECT s.id, s.student_name, s.gender, s.mobile_number, 
       CONCAT(c.name, '-', c.section) AS class, 
       CASE WHEN s.is_active THEN 'Active' ELSE 'Inactive' END AS status
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
WHERE s.is_active = 1
  AND (:search IS NULL OR (
        s.student_name ILIKE '%' || :search || '%'
     OR s.student_code ILIKE '%' || :search || '%'
     OR s.mobile_number ILIKE '%' || :search || '%'))
  AND (:class_id IS NULL OR s.class_id = :class_id)
  AND (:status IS NULL OR (s.is_active = (CASE WHEN :status = 'active' THEN 1 ELSE 0 END)))
ORDER BY s.created_at DESC
OFFSET (:page - 1) * :limit ROWS FETCH NEXT :limit ROWS ONLY;
