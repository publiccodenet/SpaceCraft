using UnityEngine;
using UnityEngine.EventSystems;

/// <summary>
/// Handles click detection for items and forwards to SpaceShipBridge
/// </summary>
[RequireComponent(typeof(ItemView))]
public class ItemSelectionHandler : MonoBehaviour, IPointerClickHandler
{
    [SerializeField] private bool _triggerOnClick = true;
    
    private ItemView _itemView;
    private SpaceShipBridge _spaceShip;
    
    private void Awake()
    {
        _itemView = GetComponent<ItemView>();
        _spaceShip = SpaceShipBridge.spaceShip;
    }
    
    public void OnPointerClick(PointerEventData eventData)
    {
        if (_triggerOnClick && _itemView != null && _itemView.Model != null && _spaceShip != null)
        {
            // Simply pass the click to SpaceShipBridge to handle
            _spaceShip.ToggleItemSelection(_itemView.Model.Id);
        }
    }
} 