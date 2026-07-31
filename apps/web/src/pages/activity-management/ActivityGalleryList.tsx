import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Photo as PhotoIcon,
  Slideshow as SlideshowIcon,
  Videocam as VideocamIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useLocation, useNavigate } from "react-router-dom";
import { EntityTableSection, ListPageLayout, ListPageToolbar } from "../../components/reusable";
import TableRowActions from "../../components/reusable/TableRowActions";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import {
  GALLERY_LIST_ROWS_PER_PAGE_OPTIONS,
  useActivityGalleryListController,
} from "../../hooks/useActivityGalleryListController";
import { useActivityGalleryPermissions } from "../../hooks/useActivityGalleryPermissions";
import activityGalleryService from "../../api/services/activityGalleryService";
import type { ActivityGalleryListItem, GalleryType } from "../../types/activityGallery";
import { createActivityGalleryListConfig } from "./ActivityGalleryList.listConfig";
import { colorTokens } from "../../tokens/colors";

const GALLERY_PATH = "/activity-management/photo-video-gallery";

function tabIndexFromGalleryType(type?: GalleryType): number {
  return type === "Video" ? 1 : 0;
}

export default function ActivityGalleryList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const perms = useActivityGalleryPermissions();
  const [tabIndex, setTabIndex] = useState(() =>
    tabIndexFromGalleryType((location.state as { galleryType?: GalleryType } | null)?.galleryType),
  );
  const galleryType: GalleryType = tabIndex === 0 ? "Photo" : "Video";
  const c = useActivityGalleryListController(galleryType);

  useEffect(() => {
    const type = (location.state as { galleryType?: GalleryType } | null)?.galleryType;
    if (type === "Photo" || type === "Video") {
      setTabIndex(tabIndexFromGalleryType(type));
    }
  }, [location.state]);

  useEffect(() => {
    if (!c.snackbar) return;
    enqueueSnackbar(c.snackbar, {
      variant: "success",
      autoHideDuration: 3000,
      anchorOrigin: { vertical: "top", horizontal: "center" },
    });
    c.setSnackbar(null);
  }, [c.snackbar, c.setSnackbar, enqueueSnackbar]);

  const handleDownload = useCallback(async (row: ActivityGalleryListItem) => {
    try {
      const gallery = await activityGalleryService.getById(row.id);
      const media = gallery.media_items ?? [];
      if (media.length === 0) {
        enqueueSnackbar("No media available to download.", {
          variant: "warning",
          autoHideDuration: 3000,
          anchorOrigin: { vertical: "top", horizontal: "center" },
        });
        return;
      }
      for (const item of media) {
        const name = item.original_file_name || item.file_name;
        await activityGalleryService.downloadMedia(row.id, item.id, name);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed";
      enqueueSnackbar(msg, {
        variant: "error",
        autoHideDuration: 4000,
        anchorOrigin: { vertical: "top", horizontal: "center" },
      });
    }
  }, [enqueueSnackbar]);

  const listConfig = useMemo(
    () =>
      createActivityGalleryListConfig({
        navigate,
        galleryType,
        onDeleteClick: c.openDeleteConfirm,
        canEdit: perms.canEdit && !perms.readOnlyAudience,
        canDelete: perms.canDelete && !perms.readOnlyAudience,
        showStatus: !perms.readOnlyAudience,
      }),
    [
      c.openDeleteConfirm,
      galleryType,
      navigate,
      perms.canDelete,
      perms.canEdit,
      perms.readOnlyAudience,
    ],
  );

  const handleTabChange = (_: React.SyntheticEvent, value: number) => {
    setTabIndex(value);
  };

  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      header={
        <>
          <PageHeader
            links={[{ title: "Photo / Video Gallery", path: GALLERY_PATH }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={c.search}
                onSearchChange={c.setSearch}
                searchPlaceholder="Search by gallery name or class…"
                {...(perms.canCreate && !perms.readOnlyAudience
                  ? {
                      onAddClick: () =>
                        navigate(`${GALLERY_PATH}/new`, { state: { galleryType } }),
                      addLabel: "Create New Gallery",
                      addIcon: <AddIcon sx={{ fontSize: 24 }} />,
                    }
                  : {})}
              />
            }
          />
          <Box sx={{ px: { xs: 2, sm: 3 }, pb: 1 }}>
            <Tabs
              value={tabIndex}
              onChange={handleTabChange}
              sx={{
                minHeight: 40,
                "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 600 },
              }}
            >
              <Tab icon={<PhotoIcon fontSize="small" />} iconPosition="start" label="Photos" />
              <Tab icon={<VideocamIcon fontSize="small" />} iconPosition="start" label="Videos" />
            </Tabs>
          </Box>
          {c.error ? (
            <Box sx={{ mx: 3, mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
              <Typography variant="body2" color="error">
                {c.error}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => void c.fetchGalleries()}
                disabled={c.loading}
              >
                {listConfig.uiPolicy.retryLabel}
              </Button>
            </Box>
          ) : null}
        </>
      }
    >
      <EntityTableSection<ActivityGalleryListItem>
        label="Galleries"
        totalRows={c.totalRows}
        page={c.page}
        rowsPerPage={c.rowsPerPage}
        onPageChange={c.setPage}
        onRowsPerPageChange={c.setRowsPerPage}
        rowsPerPageOptions={GALLERY_LIST_ROWS_PER_PAGE_OPTIONS}
        columns={listConfig.columns}
        data={c.items}
        loading={c.tableLoading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        getRowKey={(row) => row.id}
        renderRowActions={(row) => {
          const actions = listConfig.actions.rowActions(row);
          return (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Tooltip title={galleryType === "Photo" ? "View Slideshow" : "View Video"}>
                <IconButton
                  size="small"
                  onClick={actions?.onView}
                  sx={{
                    color: colorTokens.preschool.lavender.main,
                    "&:hover": { bgcolor: alpha(colorTokens.preschool.lavender.main, 0.1) },
                  }}
                >
                  {galleryType === "Photo" ? (
                    <SlideshowIcon fontSize="small" />
                  ) : (
                    <VideocamIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
              {galleryType === "Photo" && perms.canDownload ? (
                <Tooltip title="Download">
                  <IconButton
                    size="small"
                    onClick={() => void handleDownload(row)}
                    sx={{
                      color: colorTokens.primary.main,
                      "&:hover": { bgcolor: alpha(colorTokens.primary.main, 0.1) },
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
              <TableRowActions onEdit={actions?.onEdit} onDelete={actions?.onDelete} />
            </Box>
          );
        }}
        stickyHeader
        size="small"
        showPagination={c.totalRows > 0}
        showInfoBar
      />

      <ConfirmDialog
        open={c.confirmDialogOpen}
        title="Please Confirm"
        message="Are you sure you want to delete this gallery?"
        confirmLabel={c.deleteLoading ? "Deleting…" : "Confirm"}
        onConfirm={() => void c.confirmDelete()}
        onClose={c.closeDeleteConfirm}
        loading={c.deleteLoading}
      />
    </ListPageLayout>
  );
}
